<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrganizationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'logo_url' => $this->logo_url,
            'banner_url' => $this->banner_url,
            'custom_domain' => $this->custom_domain,
            'smtp_enabled' => (bool) $this->smtp_enabled,
            'hcaptcha_sitekey' => $this->hcaptcha_sitekey,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
