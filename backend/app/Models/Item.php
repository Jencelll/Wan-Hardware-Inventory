<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_code',
        'name',
        'category',
        'uom',
        'cost_price',
        'retail_price',
        'initial_count',
        'current_stock',
    ];

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function getTotalInAttribute()
    {
        if (array_key_exists('total_in', $this->attributes)) {
            return $this->attributes['total_in'] ?? 0;
        }

        if ($this->relationLoaded('transactions')) {
            return $this->transactions->where('type', 'IN')->sum('quantity');
        }
        return $this->transactions()->where('type', 'IN')->sum('quantity');
    }

    public function getTotalOutAttribute()
    {
        if (array_key_exists('total_out', $this->attributes)) {
            return $this->attributes['total_out'] ?? 0;
        }

        if ($this->relationLoaded('transactions')) {
            return $this->transactions->where('type', 'OUT')->sum('quantity');
        }
        return $this->transactions()->where('type', 'OUT')->sum('quantity');
    }
}
