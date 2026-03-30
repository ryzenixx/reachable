<?php

declare(strict_types=1);

namespace App\Services\Status;

use App\Enums\IncidentStatus;
use App\Enums\ServiceStatus;
use App\Models\Organization;
use App\Models\Service;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;

class GlobalStatusService
{
    /**
     * @return array<string, int|string|CarbonImmutable>
     */
    public function summaryForOrganization(Organization $organization): array
    {
        $services = Service::query()
            ->where('organization_id', $organization->id)
            ->get(['status']);

        $activeIncidentsCount = $organization->incidents()
            ->where('status', '!=', IncidentStatus::Resolved->value)
            ->count();

        return [
            'organization_id' => $organization->id,
            'global_status' => $this->resolveGlobalStatus($services),
            'services_count' => $services->count(),
            'active_incidents_count' => $activeIncidentsCount,
            'updated_at' => CarbonImmutable::now(),
        ];
    }

    /**
     * @param  Collection<int, Service>  $services
     */
    public function resolveGlobalStatus(Collection $services): string
    {
        if ($services->isEmpty()) {
            return ServiceStatus::Operational->value;
        }

        $statuses = $services
            ->pluck('status')
            ->map(static fn (ServiceStatus|string $status): string => $status instanceof ServiceStatus ? $status->value : (string) $status)
            ->values();

        if ($statuses->contains(ServiceStatus::MajorOutage->value) || $statuses->contains(ServiceStatus::PartialOutage->value)) {
            return ServiceStatus::MajorOutage->value;
        }

        if ($statuses->contains(ServiceStatus::Degraded->value)) {
            return ServiceStatus::Degraded->value;
        }

        if ($statuses->contains(ServiceStatus::Maintenance->value)) {
            return ServiceStatus::Maintenance->value;
        }

        return ServiceStatus::Operational->value;
    }
}
