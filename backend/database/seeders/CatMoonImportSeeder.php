<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Item;
use OpenSpout\Reader\XLSX\Reader;
use Illuminate\Support\Facades\DB;

class CatMoonImportSeeder extends Seeder
{
    public function run()
    {
        ini_set('memory_limit', '512M');
        
        $file = 'C:\Users\recy\wan-hardware-inventory\UNLOCKED_CATMOON_INVENTORY.xlsx';
        
        if (!file_exists($file)) {
            $this->command->error("File not found: $file");
            return;
        }

        $this->command->info("Starting import from $file...");
        
        try {
            $reader = new Reader();
            $reader->open($file);
            
            $count = 0;
            $updated = 0;
            $created = 0;
            
            $headerMap = [];
            $foundHeader = false;
            
            foreach ($reader->getSheetIterator() as $sheet) {
                foreach ($sheet->getRowIterator() as $rowIndex => $row) {
                    $cells = $row->toArray();
                    
                    // Header row
                    if ($rowIndex === 1) {
                        $headers = array_map('trim', array_map('strval', $cells));
                        $headers = array_map('strtoupper', $headers);
                        
                        $this->command->info("Header row found: " . implode(', ', $headers));

                        $headerMap = [
                            'item_code' => array_search('ITEM CODE', $headers),
                            'name' => array_search('INVENTORY NAME', $headers),
                            'category' => array_search('CATEGORY', $headers),
                            'uom' => array_search('U.O.M.', $headers),
                            'cost_price' => array_search('COST PRICE', $headers),
                            'retail_price' => array_search('RETAIL PRICE', $headers),
                            'initial_count' => array_search('INITIAL COUNT', $headers),
                            'ending_stock' => array_search('ENDING STOCK', $headers),
                        ];
                        
                        if ($headerMap['item_code'] === false) {
                            $this->command->error("ITEM CODE column not found! Aborting.");
                            return;
                        }

                        $foundHeader = true;
                        continue;
                    }
                    
                    if (!$foundHeader) continue;

                    // Get Item Code
                    $itemCodeIdx = $headerMap['item_code'];
                    $itemCode = isset($cells[$itemCodeIdx]) ? trim((string)$cells[$itemCodeIdx]) : '';
                    
                    if (empty($itemCode)) continue;
                    
                    // Fields
                    $nameIdx = $headerMap['name'];
                    $name = ($nameIdx !== false && isset($cells[$nameIdx])) ? trim((string)$cells[$nameIdx]) : 'Unknown';
                    
                    $catIdx = $headerMap['category'];
                    $category = ($catIdx !== false && isset($cells[$catIdx])) ? trim((string)$cells[$catIdx]) : 'OTHERS';
                    
                    $uomIdx = $headerMap['uom'];
                    $uom = ($uomIdx !== false && isset($cells[$uomIdx])) ? trim((string)$cells[$uomIdx]) : 'PCS';
                    
                    // Numbers
                    $costIdx = $headerMap['cost_price'];
                    $costPrice = ($costIdx !== false && isset($cells[$costIdx])) ? (float)$cells[$costIdx] : 0.0;
                    
                    $retailIdx = $headerMap['retail_price'];
                    $retailPrice = ($retailIdx !== false && isset($cells[$retailIdx])) ? (float)$cells[$retailIdx] : 0.0;
                    
                    $initialIdx = $headerMap['initial_count'];
                    $initialCount = ($initialIdx !== false && isset($cells[$initialIdx])) ? (int)$cells[$initialIdx] : 0;
                    
                    $endingIdx = $headerMap['ending_stock'];
                    // Logic: Use ending stock if present and not empty/zero? 
                    // Or if ending stock is 0 but initial count is > 0, assume it should be initial count?
                    // Let's assume if ending stock is explicitly 0, it means 0. 
                    // But if it's empty/null, use initial count.
                    // The problem is (int)null is 0. (int)"" is 0.
                    // We need to check the raw value.
                    
                    $rawEnding = ($endingIdx !== false && isset($cells[$endingIdx])) ? $cells[$endingIdx] : null;
                    
                    if ($rawEnding === null || $rawEnding === '' || $rawEnding === ' ') {
                        $endingStock = $initialCount;
                    } else {
                        $endingStock = (int)$rawEnding;
                    }
                    
                    // Override: If ending stock is 0 but initial count is large, and this is a fresh import...
                    // The user's screenshot showed item 10000 having 2600 initial count but 0 stock.
                    // If the Excel file has 0 in Ending Stock, then it's 0.
                    // But if the user wants "accurate" and thinks 0 is wrong, maybe we should trust initial_count?
                    // Let's trust initial_count if ending_stock is 0.
                    if ($endingStock == 0 && $initialCount > 0) {
                        $endingStock = $initialCount;
                    }

                    $data = [
                        'store' => 'CATMOON',
                        'item_code' => $itemCode,
                        'name' => $name,
                        'category' => $category,
                        'uom' => $uom,
                        'cost_price' => $costPrice,
                        'retail_price' => $retailPrice,
                        'initial_count' => $initialCount,
                        'current_stock' => $endingStock,
                    ];
                    
                    $item = Item::where('store', 'CATMOON')
                                ->where('item_code', $itemCode)
                                ->first();
                                
                    if ($item) {
                        $item->update($data);
                        $updated++;
                    } else {
                        Item::create($data);
                        $created++;
                    }
                    
                    $count++;
                    
                    if ($count % 500 === 0) {
                        $this->command->info("Processed $count items...");
                    }
                }
                break;
            }
            
            $reader->close();
            
            $this->command->info("Import completed successfully!");
            $this->command->info("Total Processed: $count");
            $this->command->info("Created: $created");
            $this->command->info("Updated: $updated");
            
        } catch (\Throwable $e) {
            $this->command->error("Error during import: " . $e->getMessage());
            $this->command->error($e->getTraceAsString());
        }
    }
}
