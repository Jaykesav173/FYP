<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Flashcard extends Model
{
    use HasFactory;

    protected $fillable = [
        'flashcard_set_id',
        'front',
        'back',
        'srs_next_review',
        'srs_ease',
        'srs_interval',
        'srs_reps',
    ];

    protected $casts = [
        'srs_next_review' => 'date',
        'srs_ease'        => 'float',
        'srs_interval'    => 'integer',
        'srs_reps'        => 'integer',
    ];

    public function flashcardSet()
    {
        return $this->belongsTo(FlashcardSet::class);
    }
}
