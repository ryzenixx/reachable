<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MonitorCheckResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'monitor_id' => $this->monitor_id,
            'status' => $this->status?->value ?? $this->status,
            'response_time_ms' => $this->response_time_ms,
            'status_code' => $this->status_code,
            'error_message' => $this->error_message,
            'checked_at' => $this->checked_at,
        ];
    }
}
