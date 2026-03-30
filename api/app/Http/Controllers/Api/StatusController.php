<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ResolvesAuthenticatedContext;
use App\Http\Controllers\Controller;
use App\Http\Resources\ServiceResource;
use App\Http\Resources\StatusSummaryResource;
use App\Models\Service;
use App\Services\Status\GlobalStatusService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StatusController extends Controller
{
    use ResolvesAuthenticatedContext;

    public function __construct(private readonly GlobalStatusService $globalStatusService) {}

    public function services(Request $request): AnonymousResourceCollection
    {
        $services = Service::query()
            ->where('organization_id', $this->organizationId($request))
            ->orderBy('order')
            ->get();

        return ServiceResource::collection($services);
    }

    public function summary(Request $request): StatusSummaryResource
    {
        $summary = $this->globalStatusService->summaryForOrganization($this->organization($request));

        return new StatusSummaryResource($summary);
    }
}
