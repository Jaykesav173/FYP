<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FlashcardSet extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'note_id',
        'note_ids',
        'title',
        'source_label',
        'num_cards',
    ];

    protected $casts = [
        'note_ids' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function note()
    {
        return $this->belongsTo(Note::class);
    }

    public function flashcards()
    {
        return $this->hasMany(Flashcard::class);
    }
}
