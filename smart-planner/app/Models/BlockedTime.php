<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BlockedTime extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'label', 'icon',
        'days', 'start_time', 'end_time',
        'color', 'is_active',
    ];

    protected $casts = [
        'days'      => 'array',
        'is_active' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Format for frontend
    public function toFormatted(): array
    {
        return [
            'id'         => $this->id,
            'label'      => $this->label,
            'icon'       => $this->icon,
            'days'       => $this->days,
            'start_time' => substr($this->start_time, 0, 5),
            'end_time'   => substr($this->end_time, 0, 5),
            'color'      => $this->color,
            'is_active'  => $this->is_active,
        ];
    }
}