<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Monitor;
use App\Services\Monitoring\MonitorExecutionService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class RunMonitorCheck implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 30;

    public function __construct(private readonly string $monitorId)
    {
        $this->onQueue('monitors');
    }

    public function handle(MonitorExecutionService $executionService): void
    {
        $monitor = Monitor::query()
            ->with('service.organization')
            ->find($this->monitorId);

        if (! $monitor instanceof Monitor || ! $monitor->is_active) {
            return;
        }

        $executionService->execute($monitor);
    }
}
