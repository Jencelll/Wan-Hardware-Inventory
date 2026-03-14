<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'store',
        'item_id',
        'type',
        'quantity',
        'particulars',
        'cost_price',
        'retail_price',
        'date',
        'customer_name',
        'customer_address',
        'customer_tin',
        'receipt_number',
    ];

    protected $appends = ['item_name'];

    protected $casts = [
        'date' => 'datetime',
    ];

    public function item()
    {
        return $this->belongsTo(Item::class);
    }

    public function getItemNameAttribute()
    {
        return $this->item->name ?? null;
    }
}
