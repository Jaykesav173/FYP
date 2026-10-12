<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Schedule;
use App\Models\StudySession;
use App\Models\Subject;
use App\Models\Completion;
use App\Models\Note;
use App\Models\FlashcardSet;
use App\Services\GeminiService;
use App\Traits\CalculatesStress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ScheduleController extends Controller
{
    use CalculatesStress;

    public function __construct(private GeminiService $ai) {}

    // ── GET /api/schedule ─────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $schedule = Schedule::where('user_id', $request->user()->id)
            ->where('is_active', true)
            ->with(['studySessions.subject', 'studySessions.completion'])
            ->latest()
            ->first();

        return response()->json([
            'success'  => true,
            'schedule' => $schedule
                ? $this->formatSchedule($schedule)
                : null,
        ]);
    }

    // ── Completion Checklist Helpers ──────────────────────────────────────────
    private function defaultChecklist(bool $completed = false): array
    {
        return [
            'flashcard_game' => $completed,
            'youtube_videos' => $completed ? 3 : 0,
            'read_notes'     => $completed,
        ];
    }

    private function isChecklistComplete(array $checklist): bool
    {
        return !empty($checklist['flashcard_game'])
            && (int)($checklist['youtube_videos'] ?? 0) >= 3
            && !empty($checklist['read_notes']);
    }

    // ── POST /api/sessions/{id}/toggle ─────────────────────────────────────
    /**
     * Complete All / Toggle session completion
     */
    public function toggleCompletion(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;
        
        $session = StudySession::where('id', $id)
            ->whereHas('schedule', function($q) use ($userId) {
                $q->where('user_id', $userId)->where('is_active', true);
            })
            ->first();
        
        if (!$session) {
            return response()->json(['success' => false, 'message' => 'Session not found.'], 404);
        }
        
        // Toggle completion
        $completion = $session->completion;
        $newCompleted = $completion ? !$completion->is_completed : true;
        $checklist = $this->defaultChecklist($newCompleted);

        if ($completion) {
            $completion->update([
                'is_completed' => $newCompleted,
                'checklist'    => $checklist,
                'completed_at' => $newCompleted ? ($completion->completed_at ?? now()) : null,
            ]);
        } else {
            $completion = Completion::create([
                'study_session_id' => $session->id,
                'user_id'          => $userId,
                'is_completed'     => $newCompleted,
                'checklist'        => $checklist,
                'completed_at'     => $newCompleted ? now() : null,
            ]);
        }
        
        // Recalculate stress/metrics
        $schedule = $session->schedule;
        $this->recalculateStress($schedule);
        $schedule->refresh();
        
        return response()->json([
            'success'      => true,
            'is_completed' => $newCompleted,
            'checklist'    => $checklist,
            'stress_score' => $schedule->stress_score,
            'stress_level' => $schedule->stress_level,
        ]);
    }

    /**
     * POST /api/sessions/{id}/checklist
     * Update individual condition in the completion checklist
     */
    public function updateChecklist(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;

        $session = StudySession::where('id', $id)
            ->whereHas('schedule', function($q) use ($userId) {
                $q->where('user_id', $userId)->where('is_active', true);
            })
            ->first();

        if (!$session) {
            return response()->json(['success' => false, 'message' => 'Session not found.'], 404);
        }

        $completion = $session->completion;
        $currentChecklist = $completion?->checklist ?? $this->defaultChecklist($completion?->is_completed ?? false);

        if ($request->has('checklist') && is_array($request->input('checklist'))) {
            $currentChecklist = array_merge($currentChecklist, $request->input('checklist'));
        } else {
            if ($request->has('flashcard_game')) {
                $currentChecklist['flashcard_game'] = (bool) $request->input('flashcard_game');
            }
            if ($request->has('youtube_videos')) {
                $currentChecklist['youtube_videos'] = max(0, min(3, (int) $request->input('youtube_videos')));
            }
            if ($request->has('read_notes')) {
                $currentChecklist['read_notes'] = (bool) $request->input('read_notes');
            }
        }

        $currentChecklist['youtube_videos'] = max(0, min(3, (int) ($currentChecklist['youtube_videos'] ?? 0)));
        $currentChecklist['flashcard_game'] = (bool) ($currentChecklist['flashcard_game'] ?? false);
        $currentChecklist['read_notes']     = (bool) ($currentChecklist['read_notes'] ?? false);

        $isCompleted = $this->isChecklistComplete($currentChecklist);

        if ($completion) {
            $completion->update([
                'checklist'    => $currentChecklist,
                'is_completed' => $isCompleted,
                'completed_at' => $isCompleted ? ($completion->completed_at ?? now()) : null,
            ]);
        } else {
            $completion = Completion::create([
                'study_session_id' => $session->id,
                'user_id'          => $userId,
                'checklist'        => $currentChecklist,
                'is_completed'     => $isCompleted,
                'completed_at'     => $isCompleted ? now() : null,
            ]);
        }

        $schedule = $session->schedule;
        $this->recalculateStress($schedule);
        $schedule->refresh();

        return response()->json([
            'success'      => true,
            'is_completed' => $isCompleted,
            'checklist'    => $currentChecklist,
            'stress_score' => $schedule->stress_score,
            'stress_level' => $schedule->stress_level,
        ]);
    }

    /**
     * POST /api/sessions/track-activity
     * Automatically update session checklist based on user activity:
     * - read_notes (when user opens/reads a note)
     * - youtube_videos (when user clicks youtube video links in summary)
     * - flashcard_game (when user plays/completes flashcard deck)
     */
    public function trackActivity(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $activityType = $request->input('activity_type'); // 'read_notes', 'youtube_videos', 'flashcard_game'

        if (!in_array($activityType, ['read_notes', 'youtube_videos', 'flashcard_game'])) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid activity type. Must be read_notes, youtube_videos, or flashcard_game.',
            ], 422);
        }

        // 1. Resolve subject_id
        $subjectId = $request->input('subject_id');

        if (!$subjectId && $request->filled('note_id')) {
            $note = Note::where('id', $request->input('note_id'))->first();
            $subjectId = $note?->subject_id;
        }

        if (!$subjectId && $request->filled('flashcard_set_id')) {
            $set = FlashcardSet::where('id', $request->input('flashcard_set_id'))->first();
            if ($set) {
                if ($set->note_id) {
                    $note = Note::where('id', $set->note_id)->first();
                    $subjectId = $note?->subject_id;
                } elseif (!empty($set->note_ids)) {
                    $firstNoteId = is_array($set->note_ids) ? $set->note_ids[0] : null;
                    if ($firstNoteId) {
                        $note = Note::where('id', $firstNoteId)->first();
                        $subjectId = $note?->subject_id;
                    }
                }
            }
        }

        // 2. Resolve study session(s)
        $schedule = Schedule::where('user_id', $userId)
            ->where('is_active', true)
            ->with(['studySessions' => function($q) {
                $q->with(['subject', 'completion']);
            }])
            ->latest()
            ->first();

        if (!$schedule) {
            return response()->json([
                'success' => true,
                'message' => 'No active schedule found.',
            ]);
        }

        // If specific session_id is provided, use that
        $targetSessions = collect();
        if ($request->filled('session_id')) {
            $session = $schedule->studySessions->firstWhere('id', (int) $request->input('session_id'));
            if ($session) {
                $targetSessions->push($session);
            }
        }

        // Otherwise find sessions by subject_id
        if ($targetSessions->isEmpty() && $subjectId) {
            $subjectSessions = $schedule->studySessions->where('subject_id', (int) $subjectId);

            // First: sessions for today
            $today = Carbon::today()->toDateString();
            $todaySessions = $subjectSessions->filter(function($s) use ($today) {
                return $s->session_date->toDateString() === $today;
            });

            if ($todaySessions->isNotEmpty()) {
                // If there are uncompleted sessions today, target them; otherwise target all today
                $uncompletedToday = $todaySessions->filter(fn($s) => !$s->completion?->is_completed);
                $targetSessions = $uncompletedToday->isNotEmpty() ? $uncompletedToday : $todaySessions;
            } else {
                // Next: upcoming uncompleted sessions
                $upcomingUncompleted = $subjectSessions->filter(function($s) use ($today) {
                    return $s->session_date->toDateString() >= $today && !$s->completion?->is_completed;
                })->sortBy('session_date');

                if ($upcomingUncompleted->isNotEmpty()) {
                    $targetSessions->push($upcomingUncompleted->first());
                } else {
                    // Fallback: any uncompleted session for this subject
                    $anyUncompleted = $subjectSessions->filter(fn($s) => !$s->completion?->is_completed)->sortBy('session_date');
                    if ($anyUncompleted->isNotEmpty()) {
                        $targetSessions->push($anyUncompleted->first());
                    } elseif ($subjectSessions->isNotEmpty()) {
                        // All completed, target the closest one
                        $targetSessions->push($subjectSessions->first());
                    }
                }
            }
        }

        if ($targetSessions->isEmpty()) {
            return response()->json([
                'success' => true,
                'message' => 'No matching study session found for this subject.',
            ]);
        }

        $updatedResults = [];

        foreach ($targetSessions as $session) {
            $completion = $session->completion;
            $checklist = $completion?->checklist ?? $this->defaultChecklist($completion?->is_completed ?? false);

            if ($activityType === 'read_notes') {
                $checklist['read_notes'] = true;
            } elseif ($activityType === 'youtube_videos') {
                $count = $request->input('count', 3);
                $currentCount = (int) ($checklist['youtube_videos'] ?? 0);
                $checklist['youtube_videos'] = max($currentCount, min(3, (int) $count));
            } elseif ($activityType === 'flashcard_game') {
                $checklist['flashcard_game'] = true;
            }

            $checklist['youtube_videos'] = max(0, min(3, (int) ($checklist['youtube_videos'] ?? 0)));
            $checklist['flashcard_game'] = (bool) ($checklist['flashcard_game'] ?? false);
            $checklist['read_notes']     = (bool) ($checklist['read_notes'] ?? false);

            $isCompleted = $this->isChecklistComplete($checklist);

            if ($completion) {
                $completion->update([
                    'checklist'    => $checklist,
                    'is_completed' => $isCompleted,
                    'completed_at' => $isCompleted ? ($completion->completed_at ?? now()) : null,
                ]);
            } else {
                $completion = Completion::create([
                    'study_session_id' => $session->id,
                    'user_id'          => $userId,
                    'checklist'        => $checklist,
                    'is_completed'     => $isCompleted,
                    'completed_at'     => $isCompleted ? now() : null,
                ]);
            }

            $updatedResults[] = [
                'session_id'   => $session->id,
                'subject_id'   => $session->subject_id,
                'subject_name' => $session->subject?->name,
                'checklist'    => $checklist,
                'is_completed' => $isCompleted,
            ];
        }

        $this->recalculateStress($schedule);
        $schedule->refresh();

        return response()->json([
            'success'       => true,
            'message'       => "Activity {$activityType} recorded successfully.",
            'activity_type' => $activityType,
            'updated'       => $updatedResults,
            'first'         => $updatedResults[0] ?? null,
            'stress_score'  => $schedule->stress_score,
            'stress_level'  => $schedule->stress_level,
        ]);
    }



    // ── POST /api/schedule/generate ───────────────────────────────────────
    public function generate(Request $request): JsonResponse
    {
        $userId   = $request->user()->id;
        $subjects = Subject::where('user_id', $userId)->get();

        if ($subjects->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Please add at least one subject first.',
            ], 422);
        }

        $today        = Carbon::today()->toDateString();
        $subjectArray = $subjects->map(fn($s) => [
            'name'            => $s->name,
            'deadline'        => $s->deadline->format('Y-m-d'),
            'difficulty'      => $s->difficulty,
            'estimated_hours' => $s->estimated_hours,
        ])->toArray();

        // ── ONE AI call instead of three ──────────────────────────────────
        // Fetch user's blocked times
        $blockedTimes = \App\Models\BlockedTime::where('user_id', $userId)
            ->where('is_active', true)
            ->get()
            ->map(fn($b) => $b->toFormatted())
            ->toArray();

        $plan = $this->ai->generateFullPlan($subjectArray, $today, $blockedTimes);

        if (!$plan) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate schedule. Please try again in a moment.',
            ], 500);
        }

        // Extract sections
        $aiSchedule = $plan['schedule']  ?? null;
        $stressData = $plan['stress']    ?? null;
        $insight    = $plan['insight']   ?? null;

        if (!$aiSchedule) {
            return response()->json([
                'success' => false,
                'message' => 'AI returned an invalid schedule. Please try again.',
            ], 500);
        }

        // Fallback stress data
        $stressData = $stressData ?? [
            'level'   => 'moderate',
            'score'   => 50,
            'message' => 'Stay consistent with your study plan.',
            'tips'    => [
                'Take a 10-minute break every hour',
                'Review notes before sleeping',
                'Stay hydrated while studying',
            ],
        ];

        // ── Deactivate old schedules ──────────────────────────────────────
        Schedule::where('user_id', $userId)->update(['is_active' => false]);

        // ── Save new schedule ─────────────────────────────────────────────
        $schedule = Schedule::create([
            'user_id'        => $userId,
            'start_date'     => $today,
            'end_date'       => Carbon::today()->addDays(6)->toDateString(),
            'summary'        => $aiSchedule['summary']       ?? 'Your personalized study plan.',
            'stress_level'   => $stressData['level']         ?? 'moderate',
            'stress_score'   => $stressData['score']         ?? 50,
            'stress_message' => $stressData['message']       ?? '',
            'stress_tips'    => $stressData['tips']          ?? [],
            'ai_insight'     => $insight                     ?? '',
            'is_active'      => true,
        ]);

        // ── Save study sessions ───────────────────────────────────────────
        $predictions = $aiSchedule['predictions'] ?? [];

        foreach ($aiSchedule['days'] ?? [] as $day) {
            // Calculate correct day name from the date
            $correctDayName = Carbon::parse($day['date'])->format('l');

            // Collect valid matched sessions for this day
            $validSessions = [];
            foreach ($day['sessions'] ?? [] as $session) {
                // Match subject name to DB record
                $subject = $subjects->first(function ($s) use ($session) {
                    return strtolower(trim($s->name)) === strtolower(trim($session['subject']));
                });

                // Try partial match if exact fails
                if (!$subject) {
                    $subject = $subjects->first(function ($s) use ($session) {
                        return str_contains(
                            strtolower($s->name),
                            strtolower($session['subject'])
                        );
                    });
                }

                if (!$subject) continue;

                $rawTime = trim($session['time'] ?? '09:00');
                if (preg_match('/^\d{1,2}:\d{2}$/', $rawTime)) {
                    $parts = explode(':', $rawTime);
                    $formattedTime = sprintf('%02d:%02d', (int)$parts[0], (int)$parts[1]);
                } else {
                    $formattedTime = '09:00';
                }

                $validSessions[] = [
                    'subject'          => $subject,
                    'session'          => $session,
                    'time'             => $formattedTime,
                    'duration_minutes' => (int) ($session['duration'] ?? 60),
                ];
            }

            // Sort chronologically by start time
            usort($validSessions, fn($a, $b) => strcmp($a['time'], $b['time']));

            // Resolve duplicate and overlapping session times
            $lastEndMinutes = 0;
            foreach ($validSessions as &$vs) {
                [$hour, $min] = explode(':', $vs['time']);
                $startMinutes = ((int) $hour * 60) + (int) $min;
                $duration = max(30, min(180, $vs['duration_minutes']));

                // If collision or overlap with prior session (needs at least 10 min break)
                if ($lastEndMinutes > 0 && $startMinutes < ($lastEndMinutes + 10)) {
                    $startMinutes = $lastEndMinutes + 15; // 15-min break after previous session
                    $newHour = (int) floor($startMinutes / 60);
                    $newMin  = $startMinutes % 60;
                    if ($newHour >= 24) {
                        $newHour = 22;
                        $newMin = 0;
                        $startMinutes = $newHour * 60;
                    }
                    $vs['time'] = sprintf('%02d:%02d', $newHour, $newMin);
                }

                $lastEndMinutes = $startMinutes + $duration;
            }
            unset($vs);

            // Save non-overlapping study sessions
            foreach ($validSessions as $vs) {
                $session = $vs['session'];
                $subject = $vs['subject'];
                $pred    = $predictions[$session['subject']] ?? null;

                StudySession::create([
                    'schedule_id'           => $schedule->id,
                    'subject_id'            => $subject->id,
                    'session_date'          => $day['date'],
                    'day_name'              => $correctDayName,
                    'start_time'            => $vs['time'] . ':00',
                    'duration_minutes'      => $vs['duration_minutes'],
                    'priority'              => $session['priority'] ?? 'medium',
                    'note'                  => $session['note']     ?? null,
                    'predicted_hours'       => $pred['predictedHours'] ?? null,
                    'prediction_confidence' => $pred['confidence']     ?? null,
                ]);
            }
        }

        // ── Load relationships and save initial stress history ────────────
        $schedule->load(['studySessions.subject', 'studySessions.completion']);
        
        // Calculate stress and save to history
        $this->recalculateStress($schedule);
        $schedule->refresh();

        return response()->json([
            'success'  => true,
            'message'  => 'Schedule generated successfully.',
            'schedule' => $this->formatSchedule($schedule),
        ], 201);
    }

    // ── Format for frontend ───────────────────────────────────────────────
    private function formatSchedule(Schedule $schedule): array
    {
        $days = $schedule->studySessions
            ->groupBy(fn($s) => $s->session_date->format('Y-m-d'))
            ->map(function ($sessions, $date) {
                // Recalculate day name from date to ensure accuracy
                $correctDayName = Carbon::parse($date)->format('l');
                
                return [
                    'date'         => $date,
                    'day'          => $correctDayName,
                    'totalMinutes' => $sessions->sum('duration_minutes'),
                    'sessions'     => $sessions->map(fn($s) => [
                        'id'                    => $s->id,
                        'subject'               => $s->subject->name,
                        'subject_id'            => $s->subject_id,
                        'time'                  => substr($s->start_time, 0, 5),
                        'duration'              => $s->duration_minutes,
                        'priority'              => $s->priority,
                        'note'                  => $s->note,
                        'predicted_hours'       => $s->predicted_hours,
                        'prediction_confidence' => $s->prediction_confidence,
                        'is_completed'          => $s->completion?->is_completed ?? false,
                        'completion_id'         => $s->completion?->id,
                        'checklist'             => $s->completion?->checklist ?? [
                            'flashcard_game' => (bool) ($s->completion?->is_completed ?? false),
                            'youtube_videos' => ($s->completion?->is_completed ?? false) ? 3 : 0,
                            'read_notes'     => (bool) ($s->completion?->is_completed ?? false),
                        ],
                    ])->values(),
                ];
            })->values();

        return [
            'id'             => $schedule->id,
            'start_date'     => $schedule->start_date->format('Y-m-d'),
            'end_date'       => $schedule->end_date->format('Y-m-d'),
            'summary'        => $schedule->summary,
            'stress_level'   => $schedule->stress_level,
            'stress_score'   => $schedule->stress_score,
            'stress_message' => $schedule->stress_message,
            'stress_tips'    => $schedule->stress_tips,
            'ai_insight'     => $schedule->ai_insight,
            'days'           => $days,
            'generated_at'   => $schedule->created_at->format('Y-m-d H:i'),
        ];
    }

    // ── Export iCal ───────────────────────────────────────────────────────
    public function exportICal(Request $request)
    {
        $schedule = Schedule::where('user_id', $request->user()->id)
            ->where('is_active', true)
            ->with(['studySessions.subject'])
            ->first();

        if (!$schedule) {
            return response()->json(['success' => false, 'message' => 'No active schedule found.'], 404);
        }

        $ical = "BEGIN:VCALENDAR\r\n";
        $ical .= "VERSION:2.0\r\n";
        $ical .= "PRODID:-//SMARTPLANNER//EN\r\n";
        $ical .= "CALSCALE:GREGORIAN\r\n";
        $ical .= "METHOD:PUBLISH\r\n";

        foreach ($schedule->studySessions as $session) {
            $dateStr = $session->session_date->format('Y-m-d');
            $start = \Carbon\Carbon::parse($dateStr . ' ' . $session->start_time);
            $end = $start->copy()->addMinutes($session->duration_minutes);

            $ical .= "BEGIN:VEVENT\r\n";
            $ical .= "UID:" . uniqid() . "@smartplanner\r\n";
            $ical .= "DTSTAMP:" . now()->format('Ymd\THis\Z') . "\r\n";
            $ical .= "DTSTART:" . $start->format('Ymd\THis') . "\r\n";
            $ical .= "DTEND:" . $end->format('Ymd\THis') . "\r\n";
            $subjectName = $session->subject ? $session->subject->name : 'General';
            $ical .= "SUMMARY:Study: {$subjectName}\r\n";
            $desc = "Priority: " . ucfirst($session->priority);
            if ($session->note) {
                $desc .= "\\n" . str_replace("\n", "\\n", $session->note);
            }
            $ical .= "DESCRIPTION:{$desc}\r\n";
            $ical .= "END:VEVENT\r\n";
        }

        $ical .= "END:VCALENDAR\r\n";

        return response($ical, 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="smartplanner-schedule.ics"',
        ]);
    }

    // ── Export Public iCal Sync Feed ──────────────────────────────────────
    public function exportICalPublic(string $emailHash)
    {
        $user = \App\Models\User::all()->first(function($u) use ($emailHash) {
            return md5(strtolower(trim($u->email))) === $emailHash;
        });

        if (!$user) {
            return response('User not found.', 404);
        }

        $schedule = Schedule::where('user_id', $user->id)
            ->where('is_active', true)
            ->with(['studySessions.subject'])
            ->first();

        if (!$schedule) {
            return response('No active schedule found.', 404);
        }

        $ical = "BEGIN:VCALENDAR\r\n";
        $ical .= "VERSION:2.0\r\n";
        $ical .= "PRODID:-//SMARTPLANNER//EN\r\n";
        $ical .= "CALSCALE:GREGORIAN\r\n";
        $ical .= "METHOD:PUBLISH\r\n";

        foreach ($schedule->studySessions as $session) {
            $dateStr = $session->session_date->format('Y-m-d');
            $start = \Carbon\Carbon::parse($dateStr . ' ' . $session->start_time);
            $end = $start->copy()->addMinutes($session->duration_minutes);

            $ical .= "BEGIN:VEVENT\r\n";
            $ical .= "UID:" . uniqid() . "@smartplanner\r\n";
            $ical .= "DTSTAMP:" . now()->format('Ymd\THis\Z') . "\r\n";
            $ical .= "DTSTART:" . $start->format('Ymd\THis') . "\r\n";
            $ical .= "DTEND:" . $end->format('Ymd\THis') . "\r\n";
            $subjectName = $session->subject ? $session->subject->name : 'General';
            $ical .= "SUMMARY:Study: {$subjectName}\r\n";
            $desc = "Priority: " . ucfirst($session->priority);
            if ($session->note) {
                $desc .= "\\n" . str_replace("\n", "\\n", $session->note);
            }
            $ical .= "DESCRIPTION:{$desc}\r\n";
            $ical .= "END:VEVENT\r\n";
        }

        $ical .= "END:VCALENDAR\r\n";

        return response($ical, 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'inline; filename="smartplanner-schedule.ics"',
        ]);
    }
}