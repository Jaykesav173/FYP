<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Note;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Services\GeminiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class QuizController extends Controller
{
    public function __construct(private GeminiService $ai) {}

    /**
     * GET /api/quizzes
     * List all quizzes for the authenticated user
     */
    public function index(Request $request): JsonResponse
{
    $paginator = Quiz::where('user_id', $request->user()->id)
        ->with('note')
        ->orderBy('created_at', 'desc')
        ->paginate(15);

    $paginator->getCollection()->transform(function($q) {
        $sourceNotes = $q->sourceNotes();
        return [
            'id'             => $q->id,
            'title'          => $q->title,
            'num_questions'  => $q->num_questions,
            'difficulty'     => $q->difficulty,
            'best_score'     => $q->best_score,
            'attempts_count' => $q->attempts_count,
            'note_id'        => $q->note_id,
            'note_ids'       => $q->note_ids,
            'note_title'     => $q->note?->title ?? 'Unknown Note',
            'source_label'   => $q->source_label,
            'quiz_notes'     => $sourceNotes->map(fn($n) => [
                'id'    => $n->id,
                'title' => $n->title,
            ]),
            'created_at'      => $q->created_at->format('M d, Y H:i'),
            'srs_next_review' => $q->srs_next_review ? $q->srs_next_review->format('M d, Y') : null,
            'srs_enabled'     => $q->srs_enabled,
        ];
    });

    return response()->json([
        'success' => true,
        'quizzes' => $paginator->items(),
        'pagination' => [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'has_more' => $paginator->hasMorePages()
        ]
    ]);
}

    /**
     * POST /api/notes/{noteId}/generate-quiz
     * Generate a quiz from a single note
     */
    public function generate(Request $request, int $noteId): JsonResponse
    {
        $request->validate([
            'num_questions' => 'integer|min:5|max:20',
            'difficulty'    => 'string|in:easy,medium,hard',
        ]);

        $note = Note::where('id', $noteId)
                    ->where('user_id', $request->user()->id)
                    ->first();

        if (!$note) {
            return response()->json(['success' => false, 'message' => 'Note not found.'], 404);
        }

        $numQuestions = $request->num_questions ?? 10;
        $difficulty   = $request->difficulty    ?? 'medium';

        // ── Get file content ───────────────────────────────────────────────
        if ($note->file_type === 'txt' && $note->text_content) {
            $content     = $note->text_content;
            $contentType = 'txt';
        } else {
            // PDF or image — read as base64
            $path = "public/notes/{$note->user_id}/{$note->stored_filename}";

            if (!Storage::exists($path)) {
                return response()->json(['success' => false, 'message' => 'File not found.'], 404);
            }

            $content     = base64_encode(Storage::get($path));
            $contentType = $note->mime_type;
        }

        // ── Generate quiz with AI ──────────────────────────────────────────
        $quizData = $this->ai->generateQuiz(
            $content,
            $contentType,
            $note->title,
            $numQuestions,
            $difficulty
        );

        if (!$quizData || empty($quizData['questions'])) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate quiz. Try again or use a smaller file.',
            ], 500);
        }

        // ── Save quiz ──────────────────────────────────────────────────────
        $quiz = Quiz::create([
            'user_id'       => $request->user()->id,
            'note_id'       => $note->id,
            'title'         => $quizData['title'] ?? "Quiz: {$note->title}",
            'questions'     => $quizData['questions'],
            'num_questions' => count($quizData['questions']),
            'difficulty'    => $difficulty,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Quiz generated successfully!',
            'quiz_id' => $quiz->id,
        ], 201);
    }

    /**
     * POST /api/quizzes/generate-multi
     * Generate a quiz from multiple notes combined
     */
    public function generateMulti(Request $request): JsonResponse
    {
        $request->validate([
            'note_ids'      => 'required|array|min:1|max:10',
            'note_ids.*'    => 'integer|exists:notes,id',
            'num_questions' => 'integer|min:5|max:20',
            'difficulty'    => 'string|in:easy,medium,hard',
        ]);

        $userId       = $request->user()->id;
        $numQuestions = $request->num_questions ?? 10;
        $difficulty   = $request->difficulty    ?? 'medium';

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
        $noteNames    = $notes->pluck('title')->toArray();
        $sourceLabel  = count($noteNames) === 1
            ? $noteNames[0]
            : implode(', ', array_slice($noteNames, 0, 2)) . (count($noteNames) > 2 ? ' +' . (count($noteNames) - 2) . ' more' : '');
        $combinedTitle = count($notes) === 1 ? $noteNames[0] : "Combined: {$sourceLabel}";

        // ── Generate with AI ───────────────────────────────────────────────────
        $quizData = $this->ai->generateQuizFromMultiple(
            $noteContents,
            $combinedTitle,
            $numQuestions,
            $difficulty
        );

        if (!$quizData || empty($quizData['questions'])) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate quiz. Try fewer notes or smaller files.',
            ], 500);
        }

        // ── Save quiz ──────────────────────────────────────────────────────────
        $quiz = Quiz::create([
            'user_id'       => $userId,
            'note_id'       => $notes->first()->id,     // primary note
            'note_ids'      => $notes->pluck('id')->toArray(),
            'source_label'  => $sourceLabel,
            'title'         => $quizData['title'] ?? "Quiz: {$combinedTitle}",
            'questions'     => $quizData['questions'],
            'num_questions' => count($quizData['questions']),
            'difficulty'    => $difficulty,
        ]);

        return response()->json([
            'success'    => true,
            'message'    => 'Quiz generated from ' . count($notes) . ' notes!',
            'quiz_id'    => $quiz->id,
            'note_count' => count($notes),
        ], 201);
    }

    /**
     * GET /api/quizzes/{id}
     * Get a specific quiz with its details and attempt history
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $quiz = Quiz::where('id', $id)
                    ->where('user_id', $request->user()->id)
                    ->with('note')
                    ->first();

        if (!$quiz) {
            return response()->json(['success' => false, 'message' => 'Quiz not found.'], 404);
        }

        // Get attempt history
        $attempts = QuizAttempt::where('quiz_id', $id)
            ->where('user_id', $request->user()->id)
            ->orderBy('completed_at', 'desc')
            ->get()
            ->map(fn($a) => [
                'id'          => $a->id,
                'score'       => $a->score,
                'total'       => $a->total,
                'percentage'  => $a->percentage,
                'time_taken'  => $a->time_taken_seconds,
                'completed_at'=> $a->completed_at->format('M d, Y H:i'),
            ]);

        return response()->json([
            'success' => true,
            'quiz'    => [
                'id'             => $quiz->id,
                'title'          => $quiz->title,
                'num_questions'  => $quiz->num_questions,
                'difficulty'     => $quiz->difficulty,
                'best_score'     => $quiz->best_score,
                'attempts_count' => $quiz->attempts_count,
                'questions'      => $quiz->questions,
                'note_title'     => $quiz->source_label ?? $quiz->note?->title ?? 'Unknown',
                'note_count'     => count($quiz->note_ids ?? [$quiz->note_id]),
                'source_notes'   => $quiz->sourceNotes()->map(fn($n) => ['id'=>$n->id,'title'=>$n->title]),
                'created_at'     => $quiz->created_at->format('M d, Y'),
                'attempts'       => $attempts,
            ],
        ]);
    }

    /**
     * GET /api/quizzes/due
     * Fetch quizzes due for SRS review today or earlier.
     */
    public function due(Request $request): JsonResponse
    {
        $dueQuizzes = Quiz::where('user_id', $request->user()->id)
            ->where('srs_enabled', true)
            ->whereNotNull('srs_next_review')
            ->where('srs_next_review', '<=', now()->toDateString())
            ->orderBy('srs_next_review', 'asc')
            ->get()
            ->map(function($q) {
                return [
                    'id'              => $q->id,
                    'title'           => $q->title,
                    'num_questions'   => $q->num_questions,
                    'difficulty'      => $q->difficulty,
                    'best_score'      => $q->best_score,
                    'srs_next_review' => $q->srs_next_review->format('M d, Y'),
                ];
            });

        return response()->json([
            'success' => true,
            'quizzes' => $dueQuizzes,
        ]);
    }

    /**
     * POST /api/quizzes/{id}/attempt
     * Submit a quiz attempt
     */
    public function attempt(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'answers'             => 'required|array',
            'answers.*'           => 'integer|min:0|max:3',
            'time_taken_seconds'  => 'nullable|integer',
        ]);

        $quiz = Quiz::where('id', $id)
                    ->where('user_id', $request->user()->id)
                    ->first();

        if (!$quiz) {
            return response()->json(['success' => false, 'message' => 'Quiz not found.'], 404);
        }

        $questions = $quiz->questions;
        $answers   = $request->answers;
        $score     = 0;
        $results   = [];

        foreach ($questions as $i => $question) {
            $selected = $answers[$i] ?? -1;
            $correct  = $question['correct_index'];
            $isRight  = $selected === $correct;
            if ($isRight) $score++;

            $results[] = [
                'question'      => $question['question'],
                'options'       => $question['options'],
                'selected'      => $selected,
                'correct_index' => $correct,
                'is_correct'    => $isRight,
                'explanation'   => $question['explanation'] ?? '',
            ];
        }

        $total      = count($questions);
        $percentage = $total > 0 ? (int) round(($score / $total) * 100) : 0;

        // Save attempt
        QuizAttempt::create([
            'user_id'            => $request->user()->id,
            'quiz_id'            => $id,
            'answers'            => $answers,
            'score'              => $score,
            'total'              => $total,
            'percentage'         => $percentage,
            'time_taken_seconds' => $request->time_taken_seconds,
            'completed_at'       => now(),
        ]);

        // Update quiz stats & SM-2 SRS logic
        $grade = $total > 0 ? round(($score / $total) * 5) : 0; // 0 to 5
        if ($grade >= 3) {
            if ($quiz->srs_reps === 0) {
                $interval = 1;
            } elseif ($quiz->srs_reps === 1) {
                $interval = 6;
            } else {
                $interval = (int) round($quiz->srs_interval * $quiz->srs_ease);
            }
            $reps = $quiz->srs_reps + 1;
        } else {
            $interval = 1;
            $reps = 0;
        }
        $ease = max(1.3, $quiz->srs_ease + (0.1 - (5 - $grade) * (0.08 + (5 - $grade) * 0.02)));
        $nextReview = now()->addDays($interval);

        $quiz->attempts_count++;
        if ($quiz->best_score === null || $percentage > $quiz->best_score) {
            $quiz->best_score = $percentage;
        }
        $quiz->srs_interval = $interval;
        $quiz->srs_reps = $reps;
        $quiz->srs_ease = $ease;
        $quiz->srs_next_review = $nextReview;
        $quiz->save();

        return response()->json([
            'success'    => true,
            'score'      => $score,
            'total'      => $total,
            'percentage' => $percentage,
            'results'    => $results,
        ]);
    }

    /**
     * DELETE /api/quizzes/{id}
     * Delete a quiz
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $quiz = Quiz::where('id', $id)
                    ->where('user_id', $request->user()->id)
                    ->first();

        if (!$quiz) {
            return response()->json(['success' => false, 'message' => 'Quiz not found.'], 404);
        }

        // Delete associated attempts first
        QuizAttempt::where('quiz_id', $id)->delete();
        
        $quiz->delete();
        
        return response()->json(['success' => true, 'message' => 'Quiz deleted.']);
    }

    // ── Public Quiz Sharing ───────────────────────────────────────────────────
    
    /**
     * POST /api/quizzes/{id}/share
     * Toggle public sharing for a quiz
     */
    public function toggleShare(Request $request, int $id): JsonResponse
    {
        $quiz = Quiz::where('id', $id)
                    ->where('user_id', $request->user()->id)
                    ->first();

        if (!$quiz) {
            return response()->json(['success' => false, 'message' => 'Quiz not found.'], 404);
        }

        $quiz->is_public = !$quiz->is_public;
        
        if ($quiz->is_public && empty($quiz->share_token)) {
            $quiz->share_token = (string) \Illuminate\Support\Str::uuid();
        }

        $quiz->save();

        return response()->json([
            'success'     => true,
            'is_public'   => $quiz->is_public,
            'share_token' => $quiz->share_token,
        ]);
    }

    /**
     * GET /api/public/quizzes/{token}
     * Fetch a public quiz without auth
     */
    public function publicShow(string $token): JsonResponse
    {
        $quiz = Quiz::where('share_token', $token)
                    ->where('is_public', true)
                    ->with('user:id,name')
                    ->first();

        if (!$quiz) {
            return response()->json(['success' => false, 'message' => 'Quiz not found or not public.'], 404);
        }

        return response()->json([
            'success' => true,
            'quiz'    => [
                'id'             => $quiz->id,
                'title'          => $quiz->title,
                'num_questions'  => $quiz->num_questions,
                'difficulty'     => $quiz->difficulty,
                'questions'      => $quiz->questions,
                'author'         => $quiz->user->name,
                'created_at'     => $quiz->created_at->format('M d, Y'),
            ],
        ]);
    }

    /**
     * POST /api/public/quizzes/{token}/attempt
     * Submit attempt for a public quiz without saving to DB
     */
    public function publicAttempt(Request $request, string $token): JsonResponse
    {
        $request->validate([
            'answers'             => 'required|array',
            'answers.*'           => 'integer|min:0|max:3',
        ]);

        $quiz = Quiz::where('share_token', $token)
                    ->where('is_public', true)
                    ->first();

        if (!$quiz) {
            return response()->json(['success' => false, 'message' => 'Quiz not found or not public.'], 404);
        }

        $questions = $quiz->questions;
        $answers   = $request->answers;
        $score     = 0;
        $results   = [];

        foreach ($questions as $i => $question) {
            $selected = $answers[$i] ?? -1;
            $correct  = $question['correct_index'];
            $isRight  = $selected === $correct;
            if ($isRight) $score++;

            $results[] = [
                'question'      => $question['question'],
                'options'       => $question['options'],
                'selected'      => $selected,
                'correct_index' => $correct,
                'is_correct'    => $isRight,
                'explanation'   => $question['explanation'] ?? '',
            ];
        }

        $total      = count($questions);
        $percentage = $total > 0 ? (int) round(($score / $total) * 100) : 0;

        return response()->json([
            'success'    => true,
            'score'      => $score,
            'total'      => $total,
            'percentage' => $percentage,
            'results'    => $results,
        ]);
    }

    /**
     * POST /api/quizzes/{id}/toggle-srs
     * Toggle Spaced Repetition (SRS) on/off for a quiz
     */
    public function toggleSrs(Request $request, int $id): JsonResponse
    {
        $quiz = Quiz::where('id', $id)
                    ->where('user_id', $request->user()->id)
                    ->first();

        if (!$quiz) {
            return response()->json(['success' => false, 'message' => 'Quiz not found.'], 404);
        }

        $quiz->srs_enabled = !$quiz->srs_enabled;
        $quiz->save();

        return response()->json([
            'success'     => true,
            'message'     => $quiz->srs_enabled ? 'Spaced Repetition enabled.' : 'Spaced Repetition disabled.',
            'srs_enabled' => $quiz->srs_enabled,
        ]);
    }
}