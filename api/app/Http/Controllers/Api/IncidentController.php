<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\IncidentImpact;
use App\Enums\IncidentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreIncidentRequest;
use App\Http\Requests\StoreIncidentUpdateRequest;
use App\Http\Requests\UpdateIncidentRequest;
use App\Http\Resources\IncidentResource;
use App\Http\Resources\IncidentUpdateResource;
use App\Models\Incident;
use App\Models\Organization;
use App\Models\User;
use App\Services\Incidents\IncidentService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class IncidentController extends Controller
{
    public function __construct(private readonly IncidentService $incidentService)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        $status = $request->query('status');

        $query = Incident::query()
            ->where('organization_id', $user->organization_id)
            ->with(['services', 'updates' => static function ($builder): void {
                $builder->latest('created_at');
            }])
            ->latest('created_at');

        if (is_string($status) && $status !== '') {
            if ($status === 'active') {
                $query->where('status', '!=', IncidentStatus::Resolved->value);
            } else {
                $query->where('status', $status);
            }
        }

        return IncidentResource::collection($query->get());
    }

    public function store(StoreIncidentRequest $request): IncidentResource
    {
        /** @var User $user */
        $user = $request->user();
        /** @var Organization $organization */
        $organization = $user->organization;

        $validated = $request->validated();

        $incident = $this->incidentService->createIncident(
            organization: $organization,
            title: $validated['title'],
            status: IncidentStatus::from($validated['status']),
            impact: IncidentImpact::from($validated['impact']),
            serviceIds: $validated['service_ids'] ?? [],
            initialMessage: $request->string('message')->toString() ?: null,
        );

        return new IncidentResource($incident->load('services', 'updates'));
    }

    public function show(Request $request, Incident $incident): IncidentResource
    {
        $this->authorize('view', $incident);

        return new IncidentResource($incident->load('services', 'updates'));
    }

    public function update(UpdateIncidentRequest $request, Incident $incident): IncidentResource
    {
        $this->authorize('update', $incident);

        $validated = $request->validated();

        $updated = $this->incidentService->updateIncident(
            incident: $incident,
            status: isset($validated['status']) ? IncidentStatus::from($validated['status']) : $incident->status,
            impact: isset($validated['impact']) ? IncidentImpact::from($validated['impact']) : null,
            resolvedAt: isset($validated['resolved_at'])
                ? CarbonImmutable::parse((string) $validated['resolved_at'])
                : null,
        );

        return new IncidentResource($updated->load('services', 'updates'));
    }

    public function addUpdate(StoreIncidentUpdateRequest $request, Incident $incident): IncidentUpdateResource
    {
        $this->authorize('update', $incident);

        $validated = $request->validated();

        $update = $this->incidentService->addUpdate(
            incident: $incident,
            status: IncidentStatus::from($validated['status']),
            message: $validated['message'],
        );

        return new IncidentUpdateResource($update);
    }

    public function destroy(Request $request, Incident $incident): JsonResponse
    {
        $this->authorize('delete', $incident);

        $incident->delete();

        return response()->json(status: 204);
    }
}
