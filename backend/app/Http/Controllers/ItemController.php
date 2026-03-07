<?php

namespace App\Http\Controllers;

use App\Models\Item;
use Illuminate\Http\Request;

class ItemController extends Controller
{
    public function index()
    {
        $items = Item::withSum(['transactions as total_in' => function ($query) {
            $query->where('type', 'IN');
        }], 'quantity')
        ->withSum(['transactions as total_out' => function ($query) {
            $query->where('type', 'OUT');
        }], 'quantity')
        ->get();
        
        $items->each->append(['total_in', 'total_out']);
        return $items;
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'item_code' => 'required|unique:items,item_code',
            'name' => 'required',
            'category' => 'required',
            'uom' => 'required',
            'cost_price' => 'required|numeric',
            'retail_price' => 'required|numeric',
            'initial_count' => 'required|integer',
        ]);

        $validated['current_stock'] = $validated['initial_count'];

        $item = Item::create($validated);

        return response()->json($item, 201);
    }

    public function show(Item $item)
    {
        return $item;
    }

    public function update(Request $request, Item $item)
    {
        $validated = $request->validate([
            'item_code' => 'required|unique:items,item_code,' . $item->id,
            'name' => 'required',
            'category' => 'required',
            'uom' => 'required',
            'cost_price' => 'required|numeric',
            'retail_price' => 'required|numeric',
            'initial_count' => 'required|integer',
        ]);

        if (isset($validated['initial_count'])) {
            $diff = $validated['initial_count'] - $item->initial_count;
            $item->current_stock += $diff;
        }

        $item->update($validated);

        return response()->json($item);
    }

    public function destroy(Item $item)
    {
        $item->delete();

        return response()->json(null, 204);
    }
}
