<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    public function index()
    {
        return Transaction::with('item')->orderBy('date', 'desc')->limit(1000)->get();
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
        ]);

        if (!isset($validated['date'])) {
            $validated['date'] = now();
        }

        return DB::transaction(function () use ($validated) {
            $transaction = Transaction::create($validated);
            $item = Item::find($validated['item_id']);

            if ($validated['type'] === 'IN') {
                $item->increment('current_stock', $validated['quantity']);
            } else {
                $item->decrement('current_stock', $validated['quantity']);
            }

            return response()->json($transaction, 201);
        });
    }
}
