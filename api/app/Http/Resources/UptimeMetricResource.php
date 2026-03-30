<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UptimeMetricResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $date = $this->date;

        return [
            'id' => $this->id,
            'service_id' => $this->service_id,
            'date' => $date instanceof CarbonInterface ? $date->toDateString() : (string) $date,
            'uptime_percentage' => (float) $this->uptime_percentage,
            'avg_response_time_ms' => (int) $this->avg_response_time_ms,
        ];
    }
}
