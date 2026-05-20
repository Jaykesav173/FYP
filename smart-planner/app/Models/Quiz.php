<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Quiz extends Model
{
    protected $fillable = [
        'user_id', 'note_id', 'note_ids', 'source_label',
        'title', 'questions', 'num_questions', 'difficulty',
        'best_score', 'attempts_count', 'srs_enabled',
    ];

    protected $casts = [
        'questions'       => 'array',
        'note_ids'        => 'array',
        'best_score'      => 'integer',
        'attempts_count'  => 'integer',
        'srs_next_review' => 'datetime',
        'srs_enabled'     => 'boolean',
    ];

    public function user()     { return $this->belongsTo(User::class); }
    public function note()     { return $this->belongsTo(Note::class); }
    public function attempts() { return $this->hasMany(QuizAttempt::class); }

    // ── All source notes (single or multi) ────────────────────────────────
    public function sourceNotes()
    {
        $ids = $this->note_ids ?? ($this->note_id ? [$this->note_id] : []);
        return Note::whereIn('id', $ids)->get();
    }
}