<?php

declare(strict_types=1);

namespace App\Services\Status;

use App\Enums\IncidentStatus;
use App\Models\Organization;
use App\Models\Service;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;

class PublicStatusPageService
{
    public function __construct(private readonly GlobalStatusService $globalStatusService) {}

    /**
     * @return array<string, mixed>
     */
    public function build(Organization $organization, int $historyPage = 1): array
    {
        $historyStart = Carbon::today()->subDays(6)->startOfDay();

        $services = Service::query()
            ->where('organization_id', $organization->id)
            ->where('is_public', true)
            ->with([
                'uptimeMetrics' => static function ($query): void {
                    $query->where('date', '>=', Carbon::today()->subDays(89)->toDateString())
                        ->orderBy('date');
                },
            ])
            ->orderBy('order')
            ->get();

        $activeIncidents = $organization->incidents()
            ->where('status', '!=', IncidentStatus::Resolved->value)
            ->with(['updates' => static function ($query): void {
                $query->latest('created_at');
            }, 'services'])
            ->latest('created_at')
            ->get();

        $maintenances = $organization->maintenances()
            ->whereIn('status', ['scheduled', 'in_progress'])
            ->orderBy('scheduled_at')
            ->get();

        /** @var LengthAwarePaginator $history */
        $history = $organization->incidents()
            ->where(static function ($query) use ($historyStart): void {
                $query->where('created_at', '>=', $historyStart)
                    ->orWhereHas('updates', static function ($updatesQuery) use ($historyStart): void {
                        $updatesQuery->where('created_at', '>=', $historyStart);
                    });
            })
            ->with(['updates' => static function ($query) use ($historyStart): void {
                $query->where('created_at', '>=', $historyStart)
                    ->latest('created_at');
            }, 'services'])
            ->latest('created_at')
            ->paginate(perPage: 100, page: $historyPage);

        return [
            'organization' => $organization,
            'global_status' => $this->globalStatusService->resolveGlobalStatus($services),
            'services' => $services,
            'active_incidents' => $activeIncidents,
            'maintenances' => $maintenances,
            'incident_history' => $history,
        ];
    }
}
