<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Completion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompletionController extends Controller
{
    /**
     * POST /api/sessions/{id}/toggle
     */
    public function toggle(Request $request, int $sessionId): JsonResponse
    {
        $completion = Completion::firstOrCreate(
            [
                'user_id'          => $request->user()->id,
                'study_session_id' => $sessionId,
            ],
            ['is_completed' => false, 'completed_at' => null]
        );

        $completion->is_completed = !$completion->is_completed;
        $completion->completed_at = $completion->is_completed ? now() : null;
        $completion->save();

        return response()->json([
            'success'      => true,
            'session_id'   => $sessionId,
            'is_completed' => $completion->is_completed,
            'completed_at' => $completion->completed_at,
        ]);
    }
}