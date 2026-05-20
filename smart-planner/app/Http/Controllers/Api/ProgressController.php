<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Schedule;
use App\Models\Subject;
use App\Traits\CalculatesStress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use App\Models\StressHistory;

class ProgressController extends Controller
{
    use CalculatesStress;

    /**
     * GET /api/progress
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $today  = Carbon::today()->toDateString();

        $schedule = Schedule::where('user_id', $userId)
            ->where('is_active', true)
            ->with('studySessions.completion')
            ->latest()
            ->first();

        // Recalculate stress based on actual completion
        if ($schedule) {
            $this->recalculateStress($schedule);
            $schedule->refresh();
        }

        $totalSessions     = 0;
        $completedSessions = 0;
        $todaySessions     = 0;
        $todayCompleted    = 0;

        if ($schedule) {
            $all = $schedule->studySessions;

            $totalSessions     = $all->count();
            $completedSessions = $all->filter(fn($s) => $s->completion?->is_completed)->count();

            $todayList      = $all->filter(fn($s) => $s->session_date->format('Y-m-d') === $today);
            $todaySessions  = $todayList->count();
            $todayCompleted = $todayList->filter(fn($s) => $s->completion?->is_completed)->count();
        }

        $completionRate = $totalSessions > 0
            ? (int) round(($completedSessions / $totalSessions) * 100)
            : 0;

        // ── NEW: Calculate study hours by day (last 7 days) ──
        $studyHoursByDay = [];
        $completionTrend = [];
        
        if ($schedule) {
            $sessions = $schedule->studySessions;
            
            // Calculate study hours by day (last 7 days)
            for ($i = 6; $i >= 0; $i--) {
                $date = Carbon::today()->subDays($i);
                $dateStr = $date->format('Y-m-d');
                
                $daySessions = $sessions->filter(fn($s) => 
                    $s->session_date->format('Y-m-d') === $dateStr
                );
                
                $completedMinutes = $daySessions
                    ->filter(fn($s) => $s->completion?->is_completed)
                    ->sum('duration_minutes');
                
                $studyHoursByDay[$dateStr] = round($completedMinutes / 60, 1);
            }
            
            // Calculate weekly completion trend (last 5 weeks)
            for ($i = 4; $i >= 0; $i--) {
                $weekStart = Carbon::today()->subWeeks($i)->startOfWeek();
                $weekEnd = Carbon::today()->subWeeks($i)->endOfWeek();
                
                $weekSessions = $sessions->filter(fn($s) => 
                    $s->session_date->between($weekStart, $weekEnd)
                );
                
                $weekTotal = $weekSessions->count();
                $weekCompleted = $weekSessions->filter(fn($s) => $s->completion?->is_completed)->count();
                $weekRate = $weekTotal > 0 ? round(($weekCompleted / $weekTotal) * 100) : 0;
                
                $completionTrend[] = [
                    'label' => 'Week ' . ($i + 1),
                    'date' => $weekStart->format('M d') . ' - ' . $weekEnd->format('M d'),
                    'completion_rate' => $weekRate,
                ];
            }
        }

        $subjects = Subject::where('user_id', $userId)
            ->with(['studySessions' => function ($q) use ($schedule) {
                if ($schedule) {
                    $q->where('schedule_id', $schedule->id)->with('completion');
                }
            }])
            ->get();

        $subjectStats = $subjects->map(function ($subject) {
            $sessions    = $subject->studySessions ?? collect();
            $total       = $sessions->count();
            $done        = $sessions->filter(fn($s) => $s->completion?->is_completed)->count();
            $firstSession = $sessions->first();

            return [
                'id'                    => $subject->id,
                'name'                  => $subject->name,
                'deadline'              => $subject->deadline->format('Y-m-d'),
                'difficulty'            => $subject->difficulty,
                'estimated_hours'       => $subject->estimated_hours,
                'days_until_deadline'   => $subject->days_until_deadline,
                'total_sessions'        => $total,
                'completed_sessions'    => $done,
                'completion_percentage' => $total > 0 ? (int) round(($done / $total) * 100) : 0,
                'predicted_hours'       => $firstSession?->predicted_hours,
                'prediction_confidence' => $firstSession?->prediction_confidence,
            ];
        });

        return response()->json([
            'success'  => true,
            'stats'    => [
                'total_subjects'     => $subjects->count(),
                'total_sessions'     => $totalSessions,
                'completed_sessions' => $completedSessions,
                'completion_rate'    => $completionRate,
                'today_sessions'     => $todaySessions,
                'today_completed'    => $todayCompleted,
                'stress_level'       => $schedule?->stress_level,
                'stress_score'       => $schedule?->stress_score,
                'stress_message'     => $schedule?->stress_message,
                'stress_tips'        => $schedule?->stress_tips ?? [],
                'ai_insight'         => $schedule?->ai_insight,
                // ── NEW fields for charts ──
                'study_hours_by_day' => $studyHoursByDay,
                'completion_trend'   => $completionTrend,
            ],
            'subjects' => $subjectStats,
        ]);
    }

    /**
     * GET /api/stress/history
     * Get stress history for charts
     */
    public function stressHistory(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        
        $history = StressHistory::where('user_id', $userId)
            ->orderBy('recorded_date', 'desc')
            ->limit(30)
            ->get()
            ->map(fn($h) => [
                'date'  => $h->recorded_date->format('Y-m-d'),
                'score' => $h->stress_score,
                'level' => $h->stress_level,
            ]);
        
        return response()->json([
            'success' => true,
            'history' => $history,
        ]);
    }

}