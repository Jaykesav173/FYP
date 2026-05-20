<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Note;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class NoteController extends Controller
{
    /**
     * GET /api/notes
     */
    public function index(Request $request): JsonResponse
    {
        $paginator = Note::where('user_id', $request->user()->id)
            ->with(['subject', 'quizzes'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        $paginator->getCollection()->transform(fn($n) => $this->formatNote($n));

        return response()->json([
            'success' => true, 
            'notes' => $paginator->items(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'has_more' => $paginator->hasMorePages()
            ]
        ]);
    }

    /**
     * POST /api/notes
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title'      => 'required|string|max:255',
            'subject_id' => 'nullable|exists:subjects,id',
            'file'       => 'required|file|max:10240|mimes:pdf,txt,jpg,jpeg,png',
        ]);

        $file     = $request->file('file');
        $ext      = strtolower($file->getClientOriginalExtension());
        $mime     = $file->getMimeType();
        $original = $file->getClientOriginalName();
        $stored   = Str::uuid() . '.' . $ext;
        $userId   = $request->user()->id;

        // Store file
        $file->storeAs("public/notes/{$userId}", $stored);

        // Extract text for TXT files
        $textContent = null;
        if ($ext === 'txt') {
            $textContent = file_get_contents($file->getRealPath());
        }

        $note = Note::create([
            'user_id'           => $userId,
            'subject_id'        => $request->subject_id,
            'title'             => $request->title,
            'original_filename' => $original,
            'stored_filename'   => $stored,
            'file_type'         => $ext,
            'mime_type'         => $mime,
            'file_size'         => $file->getSize(),
            'text_content'      => $textContent,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Note uploaded successfully!',
            'note'    => $this->formatNote($note->load(['subject', 'quizzes'])),
        ], 201);
    }

    /**
     * GET /api/notes/{id}/quizzes
     * Get all quizzes for a specific note with their associated notes
     */
    public function quizzes(Request $request, int $id): JsonResponse
    {
        $note = Note::where('id', $id)
                    ->where('user_id', $request->user()->id)
                    ->first();

        if (!$note) {
            return response()->json(['success' => false, 'message' => 'Note not found.'], 404);
        }

        $quizzes = $note->quizzes()
            ->with('notes')  // Load the notes relationship (many-to-many)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($quiz) {
                return [
                    'id'            => $quiz->id,
                    'num_questions' => $quiz->num_questions,
                    'difficulty'    => $quiz->difficulty,
                    'created_at'    => $quiz->created_at->format('M d, Y'),
                    'attempt_count' => $quiz->attempts()->count(),
                    'notes_used'    => $quiz->notes->map(function ($note) {
                        return [
                            'id'    => $note->id,
                            'title' => $note->title,
                        ];
                    }),
                ];
            });

        return response()->json([
            'success' => true,
            'quizzes' => $quizzes,
        ]);
    }

    /**
     * DELETE /api/notes/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $note = Note::where('id', $id)
                    ->where('user_id', $request->user()->id)
                    ->first();

        if (!$note) {
            return response()->json(['success' => false, 'message' => 'Note not found.'], 404);
        }

        // Delete stored file
        Storage::delete("public/notes/{$note->user_id}/{$note->stored_filename}");
        $note->delete();

        return response()->json(['success' => true, 'message' => 'Note deleted.']);
    }

   private function formatNote(Note $n): array
{
    $typeIcons = [
        'pdf'  => 'pdf',
        'txt'  => 'txt',
        'jpg'  => 'img',
        'jpeg' => 'img',
        'png'  => 'img',
    ];

    // Only count single-note quizzes (where note_ids is NULL)
    $singleNoteQuizzes = $n->quizzes->filter(fn($q) => $q->note_ids === null);

    return [
        'id'                => $n->id,
        'title'             => $n->title,
        'original_filename' => $n->original_filename,
        'file_type'         => $n->file_type,
        'file_size'         => $n->file_size_formatted,
        'type_group'        => $typeIcons[$n->file_type] ?? 'file',
        'subject'           => $n->subject ? ['id' => $n->subject->id, 'name' => $n->subject->name] : null,
        'quiz_count'        => $singleNoteQuizzes->count(),  // ← Only single-note quizzes
        'latest_quiz'       => $singleNoteQuizzes->sortByDesc('created_at')->first()?->id,  // ← Only from single-note quizzes
        'created_at'        => $n->created_at->format('M d, Y'),
    ];
}
}