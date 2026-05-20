<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FlashcardSet;
use App\Models\Note;
use App\Services\GeminiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FlashcardController extends Controller
{
    public function __construct(private GeminiService $gemini) {}

    public function generate(Request $request): JsonResponse
    {
        $request->validate([
            'note_ids'  => 'required|array|min:1|max:10',
            'note_ids.*'=> 'integer|exists:notes,id',
            'num_cards' => 'integer|min:5|max:30',
        ]);

        $userId   = $request->user()->id;
        $numCards = $request->num_cards ?? 10;

        $notes = Note::whereIn('id', $request->note_ids)
                     ->where('user_id', $userId)
                     ->get();

        if ($notes->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'Notes not found.'], 404);
        }

        $noteContents = [];
        $combinedTitle = $notes->count() > 1 ? "Mixed Flashcards" : $notes->first()->title;

        foreach ($notes as $note) {
            $path = "public/notes/{$note->user_id}/{$note->stored_filename}";
            if (!Storage::exists($path)) continue;

            $ext = strtolower($note->file_type);
            if ($ext === 'txt') {
                $noteContents[] = [
                    'title'   => $note->title,
                    'type'    => 'txt',
                    'content' => Storage::get($path)
                ];
            } else {
                $noteContents[] = [
                    'title'   => $note->title,
                    'type'    => 'file',
                    'content' => base64_encode(Storage::get($path)),
                    'mime'    => $note->mime_type,
                ];
            }
        }

        $flashcardData = $this->gemini->generateFlashcards($noteContents, $combinedTitle, $numCards);

        if (!$flashcardData || !isset($flashcardData['cards'])) {
            return response()->json(['success' => false, 'message' => 'AI generation failed.'], 500);
        }

        $set = FlashcardSet::create([
            'user_id'      => $userId,
            'note_id'      => $notes->count() === 1 ? $notes->first()->id : null,
            'note_ids'     => $notes->pluck('id')->toArray(),
            'title'        => $flashcardData['title'] ?? $combinedTitle,
            'source_label' => $combinedTitle,
            'num_cards'    => count($flashcardData['cards']),
        ]);

        foreach ($flashcardData['cards'] as $card) {
            $set->flashcards()->create([
                'front' => $card['front'],
                'back'  => $card['back'],
            ]);
        }

        return response()->json([
            'success' => true,
            'set_id'  => $set->id,
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $set = FlashcardSet::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->with('flashcards')
            ->first();

        if (!$set) {
            return response()->json(['success' => false, 'message' => 'Set not found.'], 404);
        }

        return response()->json([
            'success' => true,
            'set'     => $set,
        ]);
    }
}
