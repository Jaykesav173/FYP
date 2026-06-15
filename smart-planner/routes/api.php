<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\NoteController;
use App\Http\Controllers\Api\QuizController;
use App\Http\Controllers\Api\FlashcardController;
use App\Http\Controllers\Api\ProgressController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\SubjectController;
use App\Http\Controllers\Api\BlockedTimeController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\ProfileController;
use Illuminate\Support\Facades\Route;

// Password Reset (public — no auth needed)
Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLink']);
Route::post('/reset-password',  [PasswordResetController::class, 'resetPassword']);

// ── Public ────────────────────────────────────────────────────────────────────
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// Public Quizzes
Route::get('/public/quizzes/{token}',          [QuizController::class, 'publicShow']);
Route::post('/public/quizzes/{token}/attempt', [QuizController::class, 'publicAttempt']);
Route::get('/public/schedule/export/{email_hash}', [ScheduleController::class, 'exportICalPublic']);

// ── Protected ─────────────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Profile & Settings
    Route::get('/profile',                  [ProfileController::class, 'show']);
    Route::put('/profile/info',             [ProfileController::class, 'updateInfo']);
    Route::put('/profile/password',         [ProfileController::class, 'updatePassword']);
    Route::delete('/profile',               [ProfileController::class, 'destroy']);

    // Notes
    Route::get('/notes',          [NoteController::class, 'index']);
    Route::post('/notes',         [NoteController::class, 'store']);
    Route::put('/notes/{id}',     [NoteController::class, 'update']);
    Route::delete('/notes/{id}',  [NoteController::class, 'destroy']);
    Route::get('/notes/{id}/quizzes', [NoteController::class, 'quizzes']);

    Route::post('/notes/summarize',          [NoteController::class, 'summarize']);
    Route::post('/notes/summarize-youtube',  [NoteController::class, 'summarizeYoutube']);

    // Quizzes
    Route::get('/quizzes/due',                    [QuizController::class, 'due']);
    Route::get('/quizzes',                        [QuizController::class, 'index']);
    Route::get('/quizzes/{id}',                   [QuizController::class, 'show']);
    Route::delete('/quizzes/{id}',                [QuizController::class, 'destroy']);
    Route::post('/quizzes/generate-multi', [QuizController::class, 'generateMulti']);
    Route::post('/notes/{noteId}/generate-quiz',  [QuizController::class, 'generate']);
    Route::post('/quizzes/{id}/attempt',          [QuizController::class, 'attempt']);
    Route::post('/quizzes/{id}/share',            [QuizController::class, 'toggleShare']);
    Route::post('/quizzes/{id}/toggle-srs',       [QuizController::class, 'toggleSrs']);
    
    // Flashcards
    Route::post('/flashcards/generate-multi', [FlashcardController::class, 'generate']);
    Route::get('/flashcards/{id}',            [FlashcardController::class, 'show']);
    
    // Blocked Times
    Route::get('/blocked-times',              [BlockedTimeController::class, 'index']);
    Route::post('/blocked-times',             [BlockedTimeController::class, 'store']);
    Route::put('/blocked-times/{id}',         [BlockedTimeController::class, 'update']);
    Route::delete('/blocked-times/{id}',      [BlockedTimeController::class, 'destroy']);
    Route::post('/blocked-times/{id}/toggle', [BlockedTimeController::class, 'toggle']);

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);
    

    // Subjects
    Route::get('/subjects',            [SubjectController::class, 'index']);
    Route::post('/subjects',           [SubjectController::class, 'store']);
    Route::put('/subjects/{id}',       [SubjectController::class, 'update']);   // ← NEW
    Route::delete('/subjects/{id}',    [SubjectController::class, 'destroy']);

    // Schedule
    Route::get('/schedule/export',     [ScheduleController::class, 'exportICal']);
    Route::get('/schedule',            [ScheduleController::class, 'index']);
    Route::post('/sessions/{id}/toggle', [ScheduleController::class, 'toggleCompletion']);
    Route::get('/stress/history', [ProgressController::class, 'stressHistory']);

    // Progress
    Route::get('/progress', [ProgressController::class, 'index']);

    Route::get('/test', function () {
    return response()->json(['message' => 'API is working!']);
});

    // ── AI-Heavy Endpoints (rate limited to prevent quota abuse) ──
    Route::middleware('throttle:5,1')->group(function () {
        Route::post('/schedule/generate',  [ScheduleController::class, 'generate']);
        Route::post('/notes/{noteId}/generate-quiz',  [QuizController::class, 'generate']);
        Route::post('/quizzes/generate-multi', [QuizController::class, 'generateMulti']);
        Route::post('/notes/summarize',          [NoteController::class, 'summarize']);
        Route::post('/notes/summarize-youtube',  [NoteController::class, 'summarizeYoutube']);
    });
});