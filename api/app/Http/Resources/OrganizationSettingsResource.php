<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrganizationSettingsResource extends JsonResource
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
            'smtp_host' => $this->smtp_host,
            'smtp_port' => $this->smtp_port,
            'smtp_username' => $this->smtp_username,
            'smtp_encryption' => $this->smtp_encryption,
            'smtp_from_address' => $this->smtp_from_address,
            'smtp_from_name' => $this->smtp_from_name,
            'smtp_password_set' => is_string($this->smtp_password) && mb_strlen($this->smtp_password) > 0,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
