<?php

namespace App\Traits;

use App\Models\Schedule;
use App\Models\StressHistory;
use Illuminate\Support\Carbon;

/**
 * Shared stress calculation logic used by ScheduleController and ProgressController.
 * Extracted to avoid code duplication.
 */
trait CalculatesStress
{
    /**
     * Recalculate stress score from scratch based on task completion.
     * Stress = percentage of tasks NOT completed.
     * Also saves the result to stress history.
     */
    protected function recalculateStress(Schedule $schedule): void
    {
        $sessions = $schedule->studySessions;
        $total = $sessions->count();

        if ($total === 0) {
            $schedule->update([
                'stress_score' => 0,
                'stress_level' => 'low',
            ]);
            return;
        }

        $completed = $sessions->filter(fn($s) => $s->completion?->is_completed)->count();
        $stressScore = (int) round((($total - $completed) / $total) * 100);
        $stressLevel = $this->getStressLevelFromScore($stressScore);

        $schedule->update([
            'stress_score' => $stressScore,
            'stress_level' => $stressLevel,
        ]);

        $this->saveStressHistory($schedule);
    }

    /**
     * Get stress level label from numeric score.
     */
    protected function getStressLevelFromScore(int $score): string
    {
        if ($score <= 35) return 'low';
        if ($score <= 60) return 'moderate';
        if ($score <= 80) return 'high';
        return 'critical';
    }

    /**
     * Save (or update) today's stress entry in the history table.
     */
    protected function saveStressHistory(Schedule $schedule): void
    {
        $factors = [
            'total_sessions' => $schedule->studySessions->count(),
            'completed_sessions' => $schedule->studySessions->filter(fn($s) => $s->completion?->is_completed)->count(),
            'overdue_count' => $this->getOverdueCount($schedule),
        ];

        $existing = StressHistory::where('user_id', $schedule->user_id)
            ->where('recorded_date', Carbon::today())
            ->first();

        if ($existing) {
            $existing->update([
                'stress_score' => $schedule->stress_score,
                'stress_level' => $schedule->stress_level,
                'factors' => $factors,
            ]);
        } else {
            StressHistory::create([
                'user_id' => $schedule->user_id,
                'schedule_id' => $schedule->id,
                'stress_score' => $schedule->stress_score,
                'stress_level' => $schedule->stress_level,
                'recorded_date' => Carbon::today(),
                'factors' => $factors,
            ]);
        }
    }

    /**
     * Count study sessions that are overdue (past date and not completed).
     */
    protected function getOverdueCount(Schedule $schedule): int
    {
        $today = Carbon::today();
        return $schedule->studySessions->filter(function ($s) use ($today) {
            return !$s->completion?->is_completed &&
                   Carbon::parse($s->session_date)->lt($today);
        })->count();
    }
}
