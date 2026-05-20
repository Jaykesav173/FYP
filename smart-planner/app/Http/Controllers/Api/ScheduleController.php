<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Schedule;
use App\Models\StudySession;
use App\Models\Subject;
use App\Models\Completion;
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

    // ── POST /api/sessions/{id}/toggle ─────────────────────────────────────
  /**
 * POST /api/sessions/{id}/toggle
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
    if ($completion) {
        $completion->update(['is_completed' => !$completion->is_completed]);
        $isCompleted = $completion->is_completed;
    } else {
        $completion = Completion::create([
            'study_session_id' => $session->id,
            'user_id' => $userId,
            'is_completed' => true,
        ]);
        $isCompleted = true;
    }
    
    // ── RECALCULATE STRESS FROM SCRATCH ──
    $schedule = $session->schedule;
    $this->recalculateStress($schedule);
    
    // Refresh to get updated values
    $schedule->refresh();
    
    return response()->json([
        'success' => true,
        'is_completed' => $isCompleted,
        'stress_score' => $schedule->stress_score,
        'stress_level' => $schedule->stress_level,
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

                $pred = $predictions[$session['subject']] ?? null;

                StudySession::create([
                    'schedule_id'           => $schedule->id,
                    'subject_id'            => $subject->id,
                    'session_date'          => $day['date'],
                    'day_name'              => $correctDayName,
                    'start_time'            => $session['time'] . ':00',
                    'duration_minutes'      => $session['duration'],
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