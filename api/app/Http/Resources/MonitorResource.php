<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MonitorResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'service_id' => $this->service_id,
            'type' => $this->type?->value ?? $this->type,
            'url' => $this->url,
            'method' => $this->method?->value ?? $this->method,
            'interval_seconds' => $this->interval_seconds,
            'timeout_ms' => $this->timeout_ms,
            'expected_status_code' => $this->expected_status_code,
            'is_active' => $this->is_active,
            'latest_check' => new MonitorCheckResource($this->whenLoaded('latestCheck')),
            'checks' => MonitorCheckResource::collection($this->whenLoaded('checks')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
