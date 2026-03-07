<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_id',
        'type',
        'quantity',
        'particulars',
        'cost_price',
        'retail_price',
        'date',
    ];

    protected $appends = ['item_name'];

    public function item()
    {
        return $this->belongsTo(Item::class);
    }

    public function getItemNameAttribute()
    {
        return $this->item->name ?? null;
    }
}
