<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Item;
use App\Models\Transaction;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ImportExcelSeeder extends Seeder
{
    private $sharedStrings = [];

    public function run()
    {
        $this->command->info('Starting ImportExcelSeeder using XML parsing...');
        
        // Paths to extracted XML files
        $baseDir = 'C:/Users/recy/wan-hardware-inventory/temp_xlsx/xl/';
        $sharedStringsFile = $baseDir . 'sharedStrings.xml';
        $sheetItems = $baseDir . 'worksheets/sheet5.xml'; // Inventory List
        $sheetSales = $baseDir . 'worksheets/sheet2.xml'; // Sales
        $sheetPurchases = $baseDir . 'worksheets/sheet4.xml'; // Purchases

        if (!file_exists($sharedStringsFile)) {
            $this->command->error("Shared strings file not found at $sharedStringsFile");
            return;
        }

        // Load Shared Strings
        $this->loadSharedStrings($sharedStringsFile);
        $this->command->info('Shared strings loaded.');

        DB::beginTransaction();
        try {
            // 1. Import Items from Sheet 5
            if (file_exists($sheetItems)) {
                $this->importItems($sheetItems);
            } else {
                $this->command->error("Items sheet (sheet5.xml) not found.");
            }

            // 2. Import Sales from Sheet 2
            if (file_exists($sheetSales)) {
                $this->importTransactions($sheetSales, 'OUT');
            }

            // 3. Import Purchases from Sheet 4
            if (file_exists($sheetPurchases)) {
                $this->importTransactions($sheetPurchases, 'IN');
            }

            DB::commit();
            $this->command->info('All data imported successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            $this->command->error("Error importing data: " . $e->getMessage());
            $this->command->error($e->getTraceAsString());
        }
    }

    private function loadSharedStrings($file)
    {
        $xml = simplexml_load_file($file);
        foreach ($xml->si as $si) {
            if (isset($si->t)) {
                $this->sharedStrings[] = (string)$si->t;
            } else {
                $t = '';
                foreach ($si->r as $r) {
                    $t .= (string)$r->t;
                }
                $this->sharedStrings[] = $t;
            }
        }
    }

    private function getCellValue($cell)
    {
        $val = (string)$cell->v;
        $type = (string)$cell['t'];
        
        if ($type == 's') {
            if (isset($this->sharedStrings[(int)$val])) {
                return $this->sharedStrings[(int)$val];
            }
            return '';
        }
        return $val;
    }

    private function parseRow($row)
    {
        $rowData = [];
        foreach ($row->c as $cell) {
            $cellRef = (string)$cell['r'];
            $colLetter = preg_replace('/[0-9]+/', '', $cellRef);
            $rowData[$colLetter] = $this->getCellValue($cell);
        }
        return $rowData;
    }

    private function excelDateToCarbon($serial)
    {
        $date = null;
        if (is_numeric($serial)) {
            // Excel base date is 1900-01-01, but there is a leap year bug for 1900.
            // UNIX epoch is 1970-01-01. Difference is 25569 days.
            // So UNIX timestamp = (serial - 25569) * 86400.
            $timestamp = ($serial - 25569) * 86400;
            $date = Carbon::createFromTimestamp($timestamp);
        } else {
            // Try parsing string
            try {
                $date = Carbon::parse($serial);
            } catch (\Exception $e) {
                $date = now();
            }
        }
        
        // Sanity check for MySQL timestamp range (1970-2038)
        if ($date->year > 2037 || $date->year < 1970) {
            return now();
        }
        
        return $date;
    }

    private function importItems($file)
    {
        $this->command->info('Importing Items from Sheet 5...');
        $xml = simplexml_load_file($file);
        $rows = $xml->sheetData->row;

        $count = 0;
        foreach ($rows as $row) {
            $data = $this->parseRow($row);
            
            // Skip header (Row 1 usually)
            // Header: SEQ. #, INVENTORY NAME, ITEM CODE, ...
            if (isset($data['B']) && $data['B'] == 'INVENTORY NAME') continue;
            if (empty($data['B'])) continue; // Skip empty names

            // Mapping:
            // B: INVENTORY NAME
            // C: ITEM CODE
            // D: CATEGORY
            // E: U.O.M.
            // F: COST PRICE
            // G: RETAIL PRICE
            // H: INITIAL COUNT
            // L: ENDING STOCK

            $name = $data['B'] ?? 'Unknown';
            $itemCode = $data['C'] ?? Str::slug($name);
            $category = $data['D'] ?? 'Uncategorized';
            $uom = $data['E'] ?? 'pcs';
            $costPrice = floatval($data['F'] ?? 0);
            $retailPrice = floatval($data['G'] ?? 0);
            $initialCount = intval($data['H'] ?? 0);
            $endingStock = intval($data['L'] ?? 0);

            Item::updateOrCreate(
                ['item_code' => $itemCode],
                [
                    'name' => $name,
                    'category' => $category,
                    'uom' => $uom,
                    'cost_price' => $costPrice,
                    'retail_price' => $retailPrice,
                    'initial_count' => $initialCount,
                    'current_stock' => $endingStock
                ]
            );
            $count++;
        }
        $this->command->info("Imported $count items.");
    }

    private function importTransactions($file, $type)
    {
        $this->command->info("Importing Transactions ($type) from " . basename($file) . "...");
        $xml = simplexml_load_file($file);
        $rows = $xml->sheetData->row;

        $count = 0;
        foreach ($rows as $row) {
            $count++;
            if ($count % 100 == 0) {
                $this->command->info("Processed $count rows...");
            }
            
            $data = $this->parseRow($row);

            // Skip header
            if (isset($data['B']) && ($data['B'] == 'ITEM NAME' || $data['B'] == 'ITEM NAME:')) continue;
            if (empty($data['B'])) continue;

            // Sheet 2 (Sales/OUT):
            // A: DATE
            // B: ITEM NAME
            // C: PARTICULARS
            // D: COST PRICE
            // E: RETAIL PRICE
            // G: QTY
            
            // Sheet 4 (Purchases/IN):
            // A: DATE
            // B: ITEM NAME
            // C: PARTICULARS
            // D: COST PRICE
            // E: AMOUNT (Skip)
            // F: QTY

            $itemName = $data['B'];
            
            // Find item by name (since code might not be in transaction sheets)
            // Try exact match first
            $item = Item::where('name', $itemName)->first();
            if (!$item) {
                // Try slug match
                $item = Item::where('item_code', Str::slug($itemName))->first();
            }
            
            // If item still not found, create it temporarily or log warning
            if (!$item) {
                // Create item with minimal info
                 $item = Item::create([
                    'item_code' => Str::slug($itemName) . '-' . uniqid(),
                    'name' => $itemName,
                    'category' => 'Uncategorized',
                    'uom' => 'pcs',
                    'cost_price' => 0,
                    'retail_price' => 0,
                    'initial_count' => 0,
                    'current_stock' => 0
                ]);
            }

            $dateVal = $data['A'] ?? '';
            $date = $this->excelDateToCarbon($dateVal);
            
            $particulars = $data['C'] ?? ($type == 'IN' ? 'PURCHASE' : 'SALES');
            $costPrice = floatval($data['D'] ?? 0);
            
            if ($type == 'OUT') {
                $retailPrice = floatval($data['E'] ?? 0);
                $qty = intval($data['G'] ?? 0);
            } else {
                // Sheet 4
                $retailPrice = 0; // Not in purchases usually
                $qty = intval($data['F'] ?? 0);
            }

            try {
                Transaction::create([
                    'item_id' => $item->id,
                    'type' => $type,
                    'quantity' => $qty,
                    'particulars' => $particulars,
                    'cost_price' => $costPrice,
                    'retail_price' => $retailPrice,
                    'date' => $date,
                ]);
                $count++;
            } catch (\Exception $e) {
                $this->command->error("Failed to import transaction at row $count: " . $e->getMessage());
            }
        }
        $this->command->info("Imported $count transactions ($type).");
    }
}
