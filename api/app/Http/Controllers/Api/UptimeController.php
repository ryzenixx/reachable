<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UptimeMetricResource;
use App\Models\Service;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UptimeController extends Controller
{
    public function show(Request $request, string $serviceId): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        /** @var Service|null $service */
        $service = Service::query()
            ->where('id', $serviceId)
            ->where('organization_id', $user->organization_id)
            ->first();

        abort_if(! $service instanceof Service, 404, 'Service not found.');

        $metrics = $service->uptimeMetrics()->orderBy('date')->get();

        return UptimeMetricResource::collection($metrics);
    }
}
