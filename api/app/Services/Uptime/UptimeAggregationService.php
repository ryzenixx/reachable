<?php

declare(strict_types=1);

namespace App\Services\Uptime;

use App\Enums\MonitorCheckStatus;
use App\Models\MonitorCheck;
use App\Models\Service;
use App\Models\UptimeMetric;
use Carbon\CarbonImmutable;

class UptimeAggregationService
{
    public function aggregate(CarbonImmutable $date): void
    {
        Service::query()->chunk(100, function ($services) use ($date): void {
            foreach ($services as $service) {
                $this->aggregateServiceForDate($service, $date);
            }
        });
    }

    public function aggregateServiceForDate(Service $service, CarbonImmutable $date): void
    {
        $targetDate = $date->startOfDay();
        $dateKey = $targetDate->toDateString();
        $start = $targetDate;
        $end = $targetDate->endOfDay();

        $stats = MonitorCheck::query()
            ->join('monitors', 'monitors.id', '=', 'monitor_checks.monitor_id')
            ->where('monitors.service_id', $service->id)
            ->whereBetween('monitor_checks.checked_at', [$start, $end])
            ->selectRaw('COUNT(*) as total_checks')
            ->selectRaw('SUM(CASE WHEN monitor_checks.status != ? THEN 1 ELSE 0 END) as non_down_checks', [MonitorCheckStatus::Down->value])
            ->selectRaw('AVG(monitor_checks.response_time_ms) as avg_response_time_ms')
            ->first();

        $totalChecks = (int) ($stats?->total_checks ?? 0);

        if ($totalChecks === 0) {
            return;
        }

        $nonDownChecks = (int) ($stats?->non_down_checks ?? 0);
        $uptime = round(($nonDownChecks / $totalChecks) * 100, 2);
        $avgResponse = (int) round((float) ($stats?->avg_response_time_ms ?? 0));

        /** @var UptimeMetric|null $existing */
        $existing = UptimeMetric::query()
            ->where('service_id', $service->id)
            ->whereDate('date', $dateKey)
            ->first();

        if ($existing instanceof UptimeMetric) {
            $existing->uptime_percentage = $uptime;
            $existing->avg_response_time_ms = $avgResponse;
            $existing->save();

            return;
        }

        UptimeMetric::query()->create([
            'service_id' => $service->id,
            'date' => $dateKey,
            'uptime_percentage' => $uptime,
            'avg_response_time_ms' => $avgResponse,
        ]);
    }
}
