<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Completion extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'study_session_id',
        'is_completed',
        'checklist',
        'completed_at',
    ];

    protected $casts = [
        'is_completed' => 'boolean',
        'checklist'    => 'array',
        'completed_at' => 'datetime',
    ];

    // ── Relationships ──────────────────────────────────────────

    public function user()
    {
         return $this->belongsTo('App\Models\User');
    }

    public function studySession()
    {
        return $this->belongsTo(StudySession::class);
    }
}