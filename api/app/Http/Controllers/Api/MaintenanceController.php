<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\MaintenanceStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMaintenanceRequest;
use App\Http\Requests\UpdateMaintenanceRequest;
use App\Http\Resources\MaintenanceResource;
use App\Models\Maintenance;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MaintenanceController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        $rows = Maintenance::query()
            ->where('organization_id', $user->organization_id)
            ->latest('scheduled_at')
            ->get();

        return MaintenanceResource::collection($rows);
    }

    public function store(StoreMaintenanceRequest $request): MaintenanceResource
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validated();

        /** @var Maintenance $maintenance */
        $maintenance = Maintenance::query()->create([
            ...$validated,
            'organization_id' => $user->organization_id,
        ]);

        return new MaintenanceResource($maintenance);
    }

    public function show(Request $request, Maintenance $maintenance): MaintenanceResource
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

    public function complete(Request $request, Maintenance $maintenance): MaintenanceResource
    {
        $this->authorize('update', $maintenance);

        $maintenance->status = MaintenanceStatus::Completed;
        $maintenance->ended_at = now();
        $maintenance->save();

        return new MaintenanceResource($maintenance->refresh());
    }

    public function destroy(Request $request, Maintenance $maintenance): JsonResponse
    {
        $this->authorize('delete', $maintenance);

        $maintenance->delete();

        return response()->json(status: 204);
    }
}
