<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\MaintenanceStatus;
use App\Http\Controllers\Api\Concerns\ResolvesAuthenticatedContext;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMaintenanceRequest;
use App\Http\Requests\UpdateMaintenanceRequest;
use App\Http\Resources\MaintenanceResource;
use App\Models\Maintenance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MaintenanceController extends Controller
{
    use ResolvesAuthenticatedContext;

    public function index(Request $request): AnonymousResourceCollection
    {
        $rows = Maintenance::query()
            ->where('organization_id', $this->organizationId($request))
            ->latest('scheduled_at')
            ->get();

        return MaintenanceResource::collection($rows);
    }

    public function store(StoreMaintenanceRequest $request): MaintenanceResource
    {
        $validated = $request->validated();

        /** @var Maintenance $maintenance */
        $maintenance = Maintenance::query()->create([
            ...$validated,
            'organization_id' => $this->organizationId($request),
        ]);

        return new MaintenanceResource($maintenance);
    }

    public function show(Maintenance $maintenance): MaintenanceResource
    {
        $this->authorize('view', $maintenance);

        return new MaintenanceResource($maintenance);
    }

    public function update(UpdateMaintenanceRequest $request, Maintenance $maintenance): MaintenanceResource
    {
        $this->authorize('update', $maintenance);

        $maintenance->fill($request->validated());
        $maintenance->save();

        return new MaintenanceResource($maintenance->refresh());
    }

    public function complete(Maintenance $maintenance): MaintenanceResource
    {
        $this->authorize('update', $maintenance);

        $maintenance->status = MaintenanceStatus::Completed;
        $maintenance->ended_at = now();
        $maintenance->save();

        return new MaintenanceResource($maintenance->refresh());
    }

    public function destroy(Maintenance $maintenance): JsonResponse
    {
        $this->authorize('delete', $maintenance);

        $maintenance->delete();

        return response()->json(status: 204);
    }
}
