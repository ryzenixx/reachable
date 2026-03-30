<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Uptime\UptimeAggregationService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class AggregateUptimeMetrics extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reachable:aggregate-uptime {--date= : Aggregate a specific date (YYYY-MM-DD)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Aggregate daily uptime metrics for all services';

    public function handle(UptimeAggregationService $aggregationService): int
    {
        $option = $this->option('date');

        try {
            $date = is_string($option)
                ? CarbonImmutable::createFromFormat('Y-m-d', $option)
                : CarbonImmutable::yesterday();
        } catch (\Throwable) {
            $this->error('Invalid date format. Use YYYY-MM-DD.');

            return self::FAILURE;
        }

        $aggregationService->aggregate($date);

        $this->info(sprintf('Uptime metrics aggregated for %s.', $date->toDateString()));

        return self::SUCCESS;
    }
}
