<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SystemVersionResource extends JsonResource
{
    /**
     * @return array{
     *   current_version: string,
     *   latest_version: string|null,
     *   latest_release_url: string|null,
     *   update_available: bool,
     *   update_check_enabled: bool,
     *   checked_at: string|null
     * }
     */
    public function toArray(Request $request): array
    {
        return [
            'current_version' => (string) data_get($this->resource, 'current_version', 'dev'),
            'latest_version' => is_string(data_get($this->resource, 'latest_version'))
                ? (string) data_get($this->resource, 'latest_version')
                : null,
            'latest_release_url' => is_string(data_get($this->resource, 'latest_release_url'))
                ? (string) data_get($this->resource, 'latest_release_url')
                : null,
            'update_available' => (bool) data_get($this->resource, 'update_available', false),
            'update_check_enabled' => (bool) data_get($this->resource, 'update_check_enabled', true),
            'checked_at' => is_string(data_get($this->resource, 'checked_at'))
                ? (string) data_get($this->resource, 'checked_at')
                : null,
        ];
    }
}
