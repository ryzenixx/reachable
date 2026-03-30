<?php

declare(strict_types=1);

namespace App\Services\Incidents;

use App\Enums\IncidentImpact;
use App\Enums\IncidentStatus;
use App\Enums\ServiceStatus;
use App\Events\IncidentChanged;
use App\Events\ServiceStatusChanged;
use App\Models\Incident;
use App\Models\IncidentUpdate;
use App\Models\Organization;
use App\Models\Service;
use App\Services\Subscribers\SubscriberNotificationService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class IncidentService
{
    public function __construct(private readonly SubscriberNotificationService $notificationService)
    {
    }

    /**
     * @param list<string> $serviceIds
     */
    public function createIncident(
        Organization $organization,
        string $title,
        IncidentStatus $status,
        IncidentImpact $impact,
        array $serviceIds = [],
        ?string $initialMessage = null,
    ): Incident {
        /** @var Incident $incident */
        $incident = DB::transaction(function () use ($organization, $title, $status, $impact, $serviceIds, $initialMessage): Incident {
            $scopedServiceIds = Service::query()
                ->where('organization_id', $organization->id)
                ->whereIn('id', $serviceIds)
                ->pluck('id')
                ->all();

            /** @var Incident $created */
            $created = Incident::query()->create([
                'organization_id' => $organization->id,
                'title' => $title,
                'status' => $status,
                'impact' => $impact,
            ]);

            if ($scopedServiceIds !== []) {
                $created->services()->sync($scopedServiceIds);
            }

            IncidentUpdate::query()->create([
                'incident_id' => $created->id,
                'status' => $status,
                'message' => $initialMessage ?? 'Incident created',
            ]);

            if ($status !== IncidentStatus::Resolved) {
                Service::query()
                    ->whereIn('id', $scopedServiceIds)
                    ->where('organization_id', $organization->id)
                    ->update(['status' => ServiceStatus::MajorOutage->value]);
            }

            return $created->refresh();
        });

        $incident->loadMissing('services', 'organization', 'updates');
        $this->notificationService->sendIncidentCreated($incident);
        event(new IncidentChanged($incident));

        foreach ($incident->services as $service) {
            event(new ServiceStatusChanged($service));
        }

        return $incident;
    }

    public function updateIncident(Incident $incident, IncidentStatus $status, ?IncidentImpact $impact = null, ?CarbonImmutable $resolvedAt = null): Incident
    {
        $incident->status = $status;

        if ($impact !== null) {
            $incident->impact = $impact;
        }

        if ($status === IncidentStatus::Resolved) {
            $incident->resolved_at = $resolvedAt?->toDateTimeString() ?? CarbonImmutable::now();
        }

        $incident->save();
        $incident->refresh()->loadMissing('services', 'organization', 'updates');

        if ($status === IncidentStatus::Resolved) {
            Service::query()
                ->where('organization_id', $incident->organization_id)
                ->whereIn('id', $incident->services->pluck('id'))
                ->update([
                'status' => ServiceStatus::Operational->value,
            ]);

            $this->notificationService->sendIncidentResolved($incident);
        }

        event(new IncidentChanged($incident));

        foreach ($incident->services as $service) {
            event(new ServiceStatusChanged($service));
        }

        return $incident;
    }

    public function addUpdate(Incident $incident, IncidentStatus $status, string $message): IncidentUpdate
    {
        /** @var IncidentUpdate $update */
        $update = IncidentUpdate::query()->create([
            'incident_id' => $incident->id,
            'status' => $status,
            'message' => $message,
        ]);

        $incident->status = $status;

        if ($status === IncidentStatus::Resolved) {
            $incident->resolved_at = CarbonImmutable::now();
        }

        $incident->save();

        $incident->refresh()->loadMissing('services', 'organization', 'updates');

        if ($status === IncidentStatus::Resolved) {
            Service::query()
                ->where('organization_id', $incident->organization_id)
                ->whereIn('id', $incident->services->pluck('id'))
                ->update(['status' => ServiceStatus::Operational->value]);

            $incident->unsetRelation('services');
            $incident->loadMissing('services');

            $this->notificationService->sendIncidentResolved($incident);
        }

        event(new IncidentChanged($incident));

        foreach ($incident->services as $service) {
            event(new ServiceStatusChanged($service));
        }

        return $update;
    }
}
