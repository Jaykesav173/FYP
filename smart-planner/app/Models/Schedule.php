<?php

namespace App\Models;

use App\Models\StudySession;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Schedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'start_date',
        'end_date',
        'summary',
        'stress_level',
        'stress_score',
        'stress_message',
        'stress_tips',
        'ai_insight',
        'is_active',
    ];

    protected $casts = [
        'start_date'  => 'date',
        'end_date'    => 'date',
        'stress_tips' => 'array',   // Automatically encode/decode JSON
        'is_active'   => 'boolean',
        'stress_score'=> 'integer',
    ];

    // ── Relationships ──────────────────────────────────────────

    /**
     * Schedule belongs to a user
     */
    public function user()
    {
        return $this->belongsTo('App\Models\User');
    }

    /**
     * Schedule has many study sessions
     */
    public function studySessions()
    {
        return $this->hasMany(StudySession::class)->orderBy('session_date')->orderBy('start_time');
    }

    /**
     * Sessions grouped by date for easy frontend rendering
     */
    public function sessionsByDay()
    {
        return $this->studySessions()
                    ->with('subject')
                    ->get()
                    ->groupBy('session_date');
    }
}