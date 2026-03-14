<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Item;
use App\Models\Supplier;
use Illuminate\Support\Facades\Hash;

class CatMoonSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create CatMoon Admin
        User::create([
            'name' => 'CatMoon Admin',
            'email' => 'admin@catmoon.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'store' => 'CATMOON',
        ]);

        // Create some sample items for CatMoon
        Item::create([
            'store' => 'CATMOON',
            'item_code' => 'CM-001',
            'name' => 'Moon Rock',
            'category' => 'ROCKS',
            'uom' => 'PCS',
            'cost_price' => 50.00,
            'retail_price' => 100.00,
            'initial_count' => 100,
            'current_stock' => 100,
        ]);

        Item::create([
            'store' => 'CATMOON',
            'item_code' => 'CM-002',
            'name' => 'Star Dust',
            'category' => 'POWDER',
            'uom' => 'KG',
            'cost_price' => 200.00,
            'retail_price' => 450.00,
            'initial_count' => 50,
            'current_stock' => 50,
        ]);

        // Create a supplier
        Supplier::create([
            'store' => 'CATMOON',
            'name' => 'Galactic Supplies',
            'contact_person' => 'Zorp',
            'phone' => '123-456-7890',
            'email' => 'zorp@galactic.com',
            'address' => 'Mars Colony 1',
        ]);
    }
}
