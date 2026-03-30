<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMonitorRequest;
use App\Http\Requests\UpdateMonitorRequest;
use App\Http\Resources\MonitorCheckResource;
use App\Http\Resources\MonitorResource;
use App\Jobs\RunMonitorCheck;
use App\Models\Monitor;
use App\Models\Service;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MonitorController extends Controller
{
    private const CHECKS_LIMIT = 100;

    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        $serviceId = $request->query('service_id');

        $query = Monitor::query()
            ->whereHas('service', static function ($builder) use ($user): void {
                $builder->where('organization_id', $user->organization_id);
            })
            ->with([
                'service',
                'latestCheck',
                'checks' => static function ($builder): void {
                    $builder->latest('checked_at')->limit(100);
                },
            ]);

        if (is_string($serviceId) && $serviceId !== '') {
            $query->where('service_id', $serviceId);
        }

        return MonitorResource::collection($query->latest()->get());
    }

    public function store(StoreMonitorRequest $request): MonitorResource
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validated();

        /** @var Service|null $service */
        $service = Service::query()
            ->where('id', $validated['service_id'])
            ->where('organization_id', $user->organization_id)
            ->first();

        abort_if(! $service instanceof Service, 403, 'Service is not available in your organization.');

        /** @var Monitor $monitor */
        $monitor = Monitor::query()->create($validated);
        RunMonitorCheck::dispatch($monitor->id);

        return new MonitorResource($this->loadMonitorWithRelations($monitor));
    }

    public function show(Request $request, Monitor $monitor): MonitorResource
    {
        $this->authorize('view', $monitor);

        return new MonitorResource($this->loadMonitorWithRelations($monitor));
    }

    public function update(UpdateMonitorRequest $request, Monitor $monitor): MonitorResource
    {
        $this->authorize('update', $monitor);

        $monitor->fill($request->validated());
        $monitor->save();

        return new MonitorResource($this->loadMonitorWithRelations($monitor->refresh()));
    }

    public function destroy(Request $request, Monitor $monitor): JsonResponse
    {
        $this->authorize('delete', $monitor);

        $monitor->delete();

        return response()->json(status: 204);
    }

    public function checks(Request $request, Monitor $monitor): AnonymousResourceCollection
    {
        $this->authorize('view', $monitor);

        $checks = $monitor->checks()->latest('checked_at')->limit(200)->get();

        return MonitorCheckResource::collection($checks);
    }

    private function loadMonitorWithRelations(Monitor $monitor): Monitor
    {
        return $monitor->load([
            'service',
            'latestCheck',
            'checks' => static function ($builder): void {
                $builder->latest('checked_at')->limit(self::CHECKS_LIMIT);
            },
        ]);
    }
}
