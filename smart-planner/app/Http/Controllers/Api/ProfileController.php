<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Note;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\Schedule;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class ProfileController extends Controller
{
    /**
     * GET /api/profile
     * Return user info + account stats
     */
    public function show(Request $request): JsonResponse
    {
        $user   = $request->user();
        $userId = $user->id;

        // ── Gather stats ────────────────────────────────────────────────────
        $subjectCount  = Subject::where('user_id', $userId)->count();
        $noteCount     = Note::where('user_id', $userId)->count();
        $quizCount     = Quiz::where('user_id', $userId)->count();
        $attemptCount  = QuizAttempt::where('user_id', $userId)->count();

        // Best quiz score
        $bestScore = QuizAttempt::where('user_id', $userId)
            ->max('percentage') ?? 0;

        // Average quiz score
        $avgScore = QuizAttempt::where('user_id', $userId)
            ->avg('percentage') ?? 0;

        // Schedule completion rate
        $schedule = Schedule::where('user_id', $userId)
            ->where('is_active', true)
            ->latest()
            ->first();

        $completionRate = 0;
        if ($schedule) {
            $total     = $schedule->studySessions()->count();
            $completed = $schedule->studySessions()
                ->whereHas('completion', fn($q) => $q->where('is_completed', true))
                ->count();
            $completionRate = $total > 0 ? (int) round(($completed / $total) * 100) : 0;
        }

        // Member since
        $memberSince = $user->created_at->format('F Y');

        return response()->json([
            'success' => true,
            'user'    => [
                'id'           => $user->id,
                'name'         => $user->name,
                'email'        => $user->email,
                'email_hash'   => md5(strtolower(trim($user->email))),
                'member_since' => $memberSince,
                'initials'     => $this->getInitials($user->name),
            ],
            'stats' => [
                'subjects'        => $subjectCount,
                'notes'           => $noteCount,
                'quizzes_created' => $quizCount,
                'quiz_attempts'   => $attemptCount,
                'best_score'      => $bestScore,
                'avg_score'       => (int) round($avgScore),
                'completion_rate' => $completionRate,
            ],
        ]);
    }

    /**
     * PUT /api/profile/info
     * Update name and/or email
     */
    public function updateInfo(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'  => 'required|string|max:255',
            'email' => "required|email|unique:users,email,{$user->id}",
        ]);

        $user->update([
            'name'  => trim($validated['name']),
            'email' => $validated['email'],
        ]);

        // Update stored user in localStorage via response
        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'user'    => [
                'id'       => $user->id,
                'name'     => $user->name,
                'email'    => $user->email,
                'initials' => $this->getInitials($user->name),
            ],
        ]);
    }

    /**
     * PUT /api/profile/password
     * Change password
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'current_password' => 'required|string',
            'password'         => [
                'required', 'string', 'min:8', 'confirmed',
                Password::min(8)->numbers()->symbols(),
            ],
            'password_confirmation' => 'required',
        ]);

        // Verify current password
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        // Ensure new password is different
        if (Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'New password must be different from current password.',
            ], 422);
        }

        $user->update(['password' => Hash::make($request->password)]);

        // Revoke all other tokens (force re-login on other devices)
        $user->tokens()
             ->where('id', '!=', $request->user()->currentAccessToken()->id)
             ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully.',
        ]);
    }

    /**
     * DELETE /api/profile
     * Delete account and all data
     */
    public function destroy(Request $request): JsonResponse
    {
        $request->validate([
            'password' => 'required|string',
        ]);

        $user = $request->user();

        if (!Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Password is incorrect.',
            ], 422);
        }

        // Revoke all tokens first
        $user->tokens()->delete();

        // Delete the user (cascade deletes everything)
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Account deleted successfully.',
        ]);
    }

    private function getInitials(string $name): string
    {
        $words = explode(' ', trim($name));
        if (count($words) >= 2) {
            return strtoupper($words[0][0] . $words[1][0]);
        }
        return strtoupper(substr($name, 0, 2));
    }
}