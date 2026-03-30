<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SystemVersionResource;
use App\Services\System\VersionService;

class SystemVersionController extends Controller
{
    public function __construct(private readonly VersionService $versionService) {}

    public function show(): SystemVersionResource
    {
        return new SystemVersionResource($this->versionService->summary());
    }
}
