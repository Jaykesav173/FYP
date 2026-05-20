<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlockedTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BlockedTimeController extends Controller
{
    /**
     * GET /api/blocked-times
     */
    public function index(Request $request): JsonResponse
    {
        $blocked = BlockedTime::where('user_id', $request->user()->id)
            ->orderBy('start_time')
            ->get()
            ->map(fn($b) => $b->toFormatted());

        return response()->json(['success' => true, 'blocked_times' => $blocked]);
    }

    /**
     * POST /api/blocked-times
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'label'      => 'required|string|max:100',
            'icon'       => 'nullable|string|max:10',
            'days'       => 'required|array|min:1',
            'days.*'     => 'required|string|in:Mon,Tue,Wed,Thu,Fri,Sat,Sun',
            'start_time' => 'required|date_format:H:i',
            'end_time'   => 'required|date_format:H:i',
            'color'      => 'nullable|string|max:20',
        ]);

        $blocked = BlockedTime::create([
            'user_id'    => $request->user()->id,
            'label'      => $validated['label'],
            'icon'       => $validated['icon']  ?? '🚫',
            'days'       => $validated['days'],
            'start_time' => $validated['start_time'] . ':00',
            'end_time'   => $validated['end_time']   . ':00',
            'color'      => $validated['color'] ?? '#C0483E',
            'is_active'  => true,
        ]);

        return response()->json([
            'success'      => true,
            'message'      => 'Blocked time added.',
            'blocked_time' => $blocked->toFormatted(),
        ], 201);
    }

    /**
     * PUT /api/blocked-times/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $blocked = BlockedTime::where('id', $id)
                              ->where('user_id', $request->user()->id)
                              ->first();

        if (!$blocked) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $validated = $request->validate([
            'label'      => 'required|string|max:100',
            'icon'       => 'nullable|string|max:10',
            'days'       => 'required|array|min:1',
            'days.*'     => 'required|string|in:Mon,Tue,Wed,Thu,Fri,Sat,Sun',
            'start_time' => 'required|date_format:H:i',
            'end_time'   => 'required|date_format:H:i',
            'color'      => 'nullable|string|max:20',
            'is_active'  => 'boolean',
        ]);

        $blocked->update([
            'label'      => $validated['label'],
            'icon'       => $validated['icon']      ?? $blocked->icon,
            'days'       => $validated['days'],
            'start_time' => $validated['start_time'] . ':00',
            'end_time'   => $validated['end_time']   . ':00',
            'color'      => $validated['color']      ?? $blocked->color,
            'is_active'  => $validated['is_active']  ?? $blocked->is_active,
        ]);

        return response()->json([
            'success'      => true,
            'message'      => 'Blocked time updated.',
            'blocked_time' => $blocked->fresh()->toFormatted(),
        ]);
    }

    /**
     * DELETE /api/blocked-times/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $blocked = BlockedTime::where('id', $id)
                              ->where('user_id', $request->user()->id)
                              ->first();

        if (!$blocked) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $blocked->delete();

        return response()->json(['success' => true, 'message' => 'Blocked time deleted.']);
    }

    /**
     * POST /api/blocked-times/{id}/toggle
     * Toggle active/inactive
     */
    public function toggle(Request $request, int $id): JsonResponse
    {
        $blocked = BlockedTime::where('id', $id)
                              ->where('user_id', $request->user()->id)
                              ->first();

        if (!$blocked) {
            return response()->json(['success' => false, 'message' => 'Not found.'], 404);
        }

        $blocked->update(['is_active' => !$blocked->is_active]);

        return response()->json([
            'success'   => true,
            'is_active' => $blocked->is_active,
        ]);
    }
}