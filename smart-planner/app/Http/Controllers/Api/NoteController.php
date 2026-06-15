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

    /**
     * PUT /api/notes/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'title'      => 'required|string|max:255',
            'subject_id' => 'nullable|exists:subjects,id',
        ]);

        $note = Note::where('id', $id)
                    ->where('user_id', $request->user()->id)
                    ->first();

        if (!$note) {
            return response()->json(['success' => false, 'message' => 'Note not found.'], 404);
        }

        $note->title = $request->title;
        $note->subject_id = $request->subject_id ?: null;
        $note->save();
        $note->load('subject');

        return response()->json([
            'success' => true,
            'message' => 'Note updated successfully.',
            'note'    => $this->formatNote($note)
        ]);
    }

    /**
     * POST /api/notes/summarize
     * Summarize one or multiple notes
     */
    public function summarize(Request $request, \App\Services\GeminiService $ai): JsonResponse
    {
        $request->validate([
            'note_ids'      => 'required|array|min:1|max:10',
            'note_ids.*'    => 'integer|exists:notes,id',
        ]);

        $userId = $request->user()->id;

        // Load all notes (must belong to user)
        $notes = Note::whereIn('id', $request->note_ids)
                     ->where('user_id', $userId)
                     ->get();

        if ($notes->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'No valid notes found.'], 404);
        }

        // ── Prepare content for each note ─────────────────────────────────────
        $noteContents = [];

        foreach ($notes as $note) {
            if ($note->file_type === 'txt' && $note->text_content) {
                $noteContents[] = [
                    'title'   => $note->title,
                    'type'    => 'txt',
                    'content' => $note->text_content,
                    'mime'    => 'text/plain',
                ];
            } else {
                // PDF or image — base64
                $path = "public/notes/{$note->user_id}/{$note->stored_filename}";

                if (!Storage::exists($path)) continue;

                $noteContents[] = [
                    'title'   => $note->title,
                    'type'    => $note->file_type,
                    'content' => base64_encode(Storage::get($path)),
                    'mime'    => $note->mime_type,
                ];
            }
        }

        if (empty($noteContents)) {
            return response()->json(['success' => false, 'message' => 'Could not read note files.'], 500);
        }

        // ── Build combined title ───────────────────────────────────────────────
        $noteNames     = $notes->pluck('title')->toArray();
        $sourceLabel   = count($noteNames) === 1
            ? $noteNames[0]
            : implode(', ', array_slice($noteNames, 0, 2)) . (count($noteNames) > 2 ? ' +' . (count($noteNames) - 2) . ' more' : '');
        $combinedTitle = count($notes) === 1 ? $noteNames[0] : "Combined: {$sourceLabel}";

        // ── Generate with AI ───────────────────────────────────────────────────
        $summaryData = $ai->summarizeNotes($noteContents, $combinedTitle);

        if (!$summaryData || empty($summaryData['summary'])) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate summary. Try fewer notes or smaller files.',
            ], 500);
        }

        return response()->json([
            'success'      => true,
            'message'      => 'Summary generated successfully!',
            'note_count'   => count($notes),
            'source_label' => $sourceLabel,
            'summary_data' => $summaryData,
        ]);
    }

    /**
     * POST /api/notes/summarize-youtube
     * Summarize a YouTube video
     */
    public function summarizeYoutube(Request $request, \App\Services\GeminiService $ai): JsonResponse
    {
        $request->validate([
            'url' => 'required|url',
        ]);

        $url = $request->url;

        // Ensure it's a YouTube URL roughly
        if (!str_contains($url, 'youtube.com') && !str_contains($url, 'youtu.be')) {
            return response()->json(['success' => false, 'message' => 'Please provide a valid YouTube URL.'], 400);
        }

        $summaryData = $ai->summarizeYouTubeVideo($url);

        if (!$summaryData || empty($summaryData['summary'])) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to summarize video.',
            ], 500);
        }

        return response()->json([
            'success'      => true,
            'message'      => 'Video summarized successfully!',
            'summary_data' => $summaryData,
        ]);
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