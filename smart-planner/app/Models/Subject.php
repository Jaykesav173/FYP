<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'deadline',
        'difficulty',
        'estimated_hours',
        'important_dates',
    ];

    protected $casts = [
        'deadline'        => 'date',
        'difficulty'      => 'integer',
        'estimated_hours' => 'float',
        'important_dates' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function studySessions()
    {
        return $this->hasMany(StudySession::class);
    }

    public function getDaysUntilDeadlineAttribute(): int
    {
        return (int) now()->startOfDay()->diffInDays($this->deadline, false);
    }

    // ── Get upcoming important dates sorted by date ────────────────────────
    public function getUpcomingDatesAttribute(): array
    {
        $dates = $this->important_dates ?? [];
        $today = now()->startOfDay();

        return collect($dates)
            ->map(function ($d) use ($today) {
                $date     = \Carbon\Carbon::parse($d['date'])->startOfDay();
                $daysLeft = (int) $today->diffInDays($date, false);
                return array_merge($d, [
                    'days_left'  => $daysLeft,
                    'is_past'    => $daysLeft < 0,
                    'is_soon'    => $daysLeft >= 0 && $daysLeft <= 7,
                ]);
            })
            ->sortBy('days_left')
            ->values()
            ->toArray();
    }
}