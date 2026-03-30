<?php

declare(strict_types=1);

use App\Jobs\RunMonitorCheck;
use App\Models\Monitor;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schedule;

Schedule::call(function (): void {
    Monitor::query()
        ->where('is_active', true)
        ->with([
            'checks' => static function ($query): void {
                $query->latest('checked_at')->limit(1);
            },
        ])
        ->chunk(200, function ($monitors): void {
            $now = Carbon::now();

            foreach ($monitors as $monitor) {
                $latestCheck = $monitor->checks->first();
                $elapsedSeconds = $latestCheck?->checked_at?->diffInSeconds($now);
                $lockKey = sprintf('monitor-dispatch:%s', $monitor->id);
                $lockSeconds = max(5, (int) $monitor->interval_seconds);

                if (($latestCheck === null || ($elapsedSeconds !== null && $elapsedSeconds >= $monitor->interval_seconds))
                    && Cache::add($lockKey, true, $now->copy()->addSeconds($lockSeconds))) {
                    RunMonitorCheck::dispatch($monitor->id);
                }
            }
        });
})
    ->everySecond()
    ->name('reachable-dispatch-monitor-checks')
    ->withoutOverlapping(1);

Schedule::command('reachable:aggregate-uptime')->dailyAt('00:05')->name('reachable-aggregate-uptime');
