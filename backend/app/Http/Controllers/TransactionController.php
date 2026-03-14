<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $store = $request->user()->store ?? 'WAN';
        return Transaction::where('store', $store)->with('item')->orderBy('date', 'desc')->limit(1000)->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'item_id' => 'required|exists:items,id',
            'type' => 'required|in:IN,OUT',
            'quantity' => 'required|integer|min:1',
            'particulars' => 'nullable|string',
            'cost_price' => 'nullable|numeric',
            'retail_price' => 'nullable|numeric',
            'date' => 'nullable|date',
            'customer_name' => 'nullable|string',
            'customer_address' => 'nullable|string',
            'customer_tin' => 'nullable|string',
        ]);
        
        $store = $request->user()->store ?? 'WAN';

        // Ensure item belongs to store
        $item = Item::find($validated['item_id']);
        if ($item->store !== $store) {
            return response()->json(['message' => 'Unauthorized item'], 403);
        }

        if (!isset($validated['date'])) {
            $validated['date'] = now();
        } else {
            $validated['date'] = Carbon::parse($validated['date']);
        }
        
        $validated['store'] = $store;

        return DB::transaction(function () use ($validated, $item) {
            $transaction = Transaction::create($validated);
            // $item is already found above

            if ($validated['type'] === 'IN') {
                $item->increment('current_stock', $validated['quantity']);
            } else {
                $item->decrement('current_stock', $validated['quantity']);
            }

            return response()->json($transaction, 201);
        });
    }
}
