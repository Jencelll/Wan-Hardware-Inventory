<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $store = $request->user()->store ?? 'WAN';
        return Supplier::where('store', $store)->orderBy('name')->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
        ]);
        
        $validated['store'] = $request->user()->store ?? 'WAN';

        $supplier = Supplier::create($validated);

        return response()->json($supplier, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Supplier $supplier)
    {
        return $supplier;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Supplier $supplier)
    {
        $store = $request->user()->store ?? 'WAN';
        if ($supplier->store !== $store) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
        ]);

        $supplier->update($validated);

        return response()->json($supplier);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Supplier $supplier)
    {
        // Check authorization (store) - implicit in query if using Global Scope, 
        // but explicit here since we don't have scopes yet.
        // In a real app we'd get user from request, but destroy method signature
        // often doesn't include Request unless we add it.
        // Let's use request helper or add Request $request
        
        if (request()->user()->store !== $supplier->store) {
             return response()->json(['message' => 'Unauthorized'], 403);
        }

        $supplier->delete();
        return response()->json(null, 204);
    }
}
