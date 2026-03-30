<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IncidentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization_id' => $this->organization_id,
            'title' => $this->title,
            'status' => $this->status?->value ?? $this->status,
            'impact' => $this->impact?->value ?? $this->impact,
            'resolved_at' => $this->resolved_at,
            'services' => ServiceResource::collection($this->whenLoaded('services')),
            'updates' => IncidentUpdateResource::collection($this->whenLoaded('updates')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
