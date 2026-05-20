<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudySession extends Model
{
    use HasFactory;

    protected $fillable = [
        'schedule_id',
        'subject_id',
        'session_date',
        'day_name',
        'start_time',
        'duration_minutes',
        'priority',
        'note',
        'predicted_hours',
        'prediction_confidence',
    ];

    protected $casts = [
        'session_date'          => 'date',
        'duration_minutes'      => 'integer',
        'predicted_hours'       => 'float',
        'prediction_confidence' => 'float',
    ];

    // ── Relationships ──────────────────────────────────────────

    /**
     * Session belongs to a schedule
     */
    public function schedule()
    {
        return $this->belongsTo(Schedule::class);
    }

    /**
     * Session belongs to a subject
     */
    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * Session has one completion record
     */
    public function completion()
    {
        return $this->hasOne(Completion::class);
    }
}