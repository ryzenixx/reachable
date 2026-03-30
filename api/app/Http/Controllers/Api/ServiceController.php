<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Services\ReorderServicesAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\ReorderServicesRequest;
use App\Http\Requests\StoreServiceRequest;
use App\Http\Requests\UpdateServiceRequest;
use App\Http\Resources\ServiceResource;
use App\Models\Service;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ServiceController extends Controller
{
    public function __construct(private readonly ReorderServicesAction $reorderServicesAction)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        $services = Service::query()
            ->where('organization_id', $user->organization_id)
            ->with([
                'monitors.latestCheck',
                'uptimeMetrics' => static function ($query): void {
                    $query->orderBy('date', 'desc')->limit(90);
                },
            ])
            ->orderBy('order')
            ->get();

        return ServiceResource::collection($services);
    }

    public function store(StoreServiceRequest $request): ServiceResource
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validated();

        $order = $validated['order'] ?? ((int) Service::query()->where('organization_id', $user->organization_id)->max('order') + 1);

        /** @var Service $service */
        $service = Service::query()->create([
            ...$validated,
            'organization_id' => $user->organization_id,
            'order' => $order,
        ]);

        return new ServiceResource($service->load('monitors.latestCheck', 'uptimeMetrics'));
    }

    public function show(Request $request, Service $service): ServiceResource
    {
        $this->authorize('view', $service);

        return new ServiceResource($service->load('monitors.latestCheck', 'uptimeMetrics'));
    }

    public function update(UpdateServiceRequest $request, Service $service): ServiceResource
    {
        $this->authorize('update', $service);

        $service->fill($request->validated());
        $service->save();

        return new ServiceResource($service->refresh()->load('monitors.latestCheck', 'uptimeMetrics'));
    }

    public function destroy(Request $request, Service $service): JsonResponse
    {
        $this->authorize('delete', $service);

        $service->delete();

        return response()->json(status: 204);
    }

    public function reorder(ReorderServicesRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->reorderServicesAction->execute($user, $request->validated('services'));

        return response()->json(['message' => 'Services reordered successfully.']);
    }
}
