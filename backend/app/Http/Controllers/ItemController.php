<?php

namespace App\Http\Controllers;

use App\Models\Item;
use Illuminate\Http\Request;

class ItemController extends Controller
{
    public function index(Request $request)
    {
        $store = $request->user()->store ?? 'WAN';
        $items = Item::where('store', $store)
        ->withSum(['transactions as total_in' => function ($query) {
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
            'item_code' => 'required',
            'name' => 'required',
            'category' => 'required',
            'uom' => 'required',
            'cost_price' => 'required|numeric',
            'retail_price' => 'required|numeric',
            'initial_count' => 'required|integer',
        ]);

        $store = $request->user()->store ?? 'WAN';
        
        // Check uniqueness within the store
        $exists = Item::where('store', $store)
            ->where('item_code', $validated['item_code'])
            ->exists();
            
        if ($exists) {
            return response()->json(['message' => 'The item code has already been taken.'], 422);
        }

        $validated['current_stock'] = $validated['initial_count'];
        $validated['store'] = $store;

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
            'item_code' => 'required',
            'name' => 'required',
            'category' => 'required',
            'uom' => 'required',
            'cost_price' => 'required|numeric',
            'retail_price' => 'required|numeric',
            'initial_count' => 'required|numeric',
            'created_at' => 'nullable|date',
        ]);
        
        $store = $request->user()->store ?? 'WAN';
        
        // Ensure item belongs to store
        if ($item->store !== $store) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Check uniqueness within the store
        $exists = Item::where('store', $store)
            ->where('item_code', $validated['item_code'])
            ->where('id', '!=', $item->id)
            ->exists();
            
        if ($exists) {
            return response()->json(['message' => 'The item code has already been taken.'], 422);
        }

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
