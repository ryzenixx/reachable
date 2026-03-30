<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StatusSummaryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'organization_id' => $this['organization_id'],
            'global_status' => $this['global_status'],
            'services_count' => $this['services_count'],
            'active_incidents_count' => $this['active_incidents_count'],
            'updated_at' => $this['updated_at'],
        ];
    }
}
