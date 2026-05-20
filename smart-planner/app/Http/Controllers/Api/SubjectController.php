<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    // ── Format subject for response ───────────────────────────────────────
    private function formatSubject(Subject $s): array
    {
        return [
            'id'                  => $s->id,
            'name'                => $s->name,
            'deadline'            => $s->deadline->format('Y-m-d'),
            'difficulty'          => $s->difficulty,
            'estimated_hours'     => $s->estimated_hours,
            'important_dates'     => $s->important_dates ?? [],
            'upcoming_dates'      => $s->upcoming_dates,
            'days_until_deadline' => $s->days_until_deadline,
            'created_at'          => $s->created_at,
        ];
    }

    /**
     * GET /api/subjects
     */
    public function index(Request $request): JsonResponse
    {
        $subjects = Subject::where('user_id', $request->user()->id)
            ->orderBy('deadline', 'asc')
            ->get()
            ->map(fn($s) => $this->formatSubject($s));

        return response()->json(['success' => true, 'subjects' => $subjects]);
    }

    /**
     * POST /api/subjects
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'                       => 'required|string|max:255',
            'deadline'                   => 'required|date|after_or_equal:today',
            'difficulty'                 => 'required|integer|min:1|max:4',
            'estimated_hours'            => 'required|numeric|min:1|max:500',
            'important_dates'            => 'nullable|array',
            'important_dates.*.type'     => 'required|string|in:midterm,quiz,final,assignment,other',
            'important_dates.*.label'    => 'required|string|max:100',
            'important_dates.*.date'     => 'required|date',
        ]);

        $subject = Subject::create([
            'user_id'         => $request->user()->id,
            'name'            => $validated['name'],
            'deadline'        => $validated['deadline'],
            'difficulty'      => $validated['difficulty'],
            'estimated_hours' => $validated['estimated_hours'],
            'important_dates' => $validated['important_dates'] ?? [],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Subject added successfully.',
            'subject' => $this->formatSubject($subject),
        ], 201);
    }

    /**
     * PUT /api/subjects/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $subject = Subject::where('id', $id)
                          ->where('user_id', $request->user()->id)
                          ->first();

        if (!$subject) {
            return response()->json(['success' => false, 'message' => 'Subject not found.'], 404);
        }

        $validated = $request->validate([
            'name'                       => 'required|string|max:255',
            'deadline'                   => 'required|date',
            'difficulty'                 => 'required|integer|min:1|max:4',
            'estimated_hours'            => 'required|numeric|min:1|max:500',
            'important_dates'            => 'nullable|array',
            'important_dates.*.type'     => 'required|string|in:midterm,quiz,final,assignment,other',
            'important_dates.*.label'    => 'required|string|max:100',
            'important_dates.*.date'     => 'required|date',
        ]);

        $subject->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Subject updated successfully.',
            'subject' => $this->formatSubject($subject->fresh()),
        ]);
    }

    /**
     * DELETE /api/subjects/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $subject = Subject::where('id', $id)
                          ->where('user_id', $request->user()->id)
                          ->first();

        if (!$subject) {
            return response()->json(['success' => false, 'message' => 'Subject not found.'], 404);
        }

        $subject->delete();

        return response()->json(['success' => true, 'message' => 'Subject deleted.']);
    }
}