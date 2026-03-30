<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $uptimeMetrics = $this->whenLoaded('uptimeMetrics');

        return [
            'id' => $this->id,
            'organization_id' => $this->organization_id,
            'name' => $this->name,
            'description' => $this->description,
            'status' => $this->status?->value ?? $this->status,
            'order' => $this->order,
            'is_public' => $this->is_public,
            'uptime_percentage' => $this->whenLoaded('uptimeMetrics', function () {
                if ($this->uptimeMetrics->isEmpty()) {
                    return null;
                }

                return round((float) $this->uptimeMetrics->avg('uptime_percentage'), 2);
            }),
            'uptime_metrics' => UptimeMetricResource::collection($uptimeMetrics),
            'monitors' => MonitorResource::collection($this->whenLoaded('monitors')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
