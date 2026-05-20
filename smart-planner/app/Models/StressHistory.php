<?php
// app/Models/StressHistory.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StressHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'schedule_id',
        'stress_score',
        'stress_level',
        'recorded_date',
        'factors',
    ];

    protected $casts = [
        'factors' => 'array',
        'recorded_date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function schedule()
    {
        return $this->belongsTo(Schedule::class);
    }
}