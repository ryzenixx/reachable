<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ServiceResource;
use App\Http\Resources\StatusSummaryResource;
use App\Models\Service;
use App\Models\User;
use App\Services\Status\GlobalStatusService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StatusController extends Controller
{
    public function __construct(private readonly GlobalStatusService $globalStatusService)
    {
    }

    public function services(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        $services = Service::query()
            ->where('organization_id', $user->organization_id)
            ->orderBy('order')
            ->get();

        return ServiceResource::collection($services);
    }

    public function summary(Request $request): StatusSummaryResource
    {
        /** @var User $user */
        $user = $request->user();

        $summary = $this->globalStatusService->summaryForOrganization($user->organization);

        return new StatusSummaryResource($summary);
    }
}
