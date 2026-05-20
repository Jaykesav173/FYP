<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Fields that can be mass-assigned (safe to fill via forms/API)
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * Fields hidden from JSON responses (never expose password)
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password'          => 'hashed',
    ];

    // ── Relationships ──────────────────────────────────────────

    /**
     * A user has many subjects they are studying
     */
    public function subjects()
    {
        return $this->hasMany(Subject::class);
    }

    /**
     * A user has many generated schedules
     */
    public function schedules()
    {
        return $this->hasMany(Schedule::class);
    }

    /**
     * A user has many task completions
     */
    public function completions()
    {
        return $this->hasMany(Completion::class);
    }

    /**
     * Helper: get only the currently active schedule
     */
    public function activeSchedule()
    {
        return $this->hasOne(Schedule::class)->where('is_active', true)->latest();
    }
}