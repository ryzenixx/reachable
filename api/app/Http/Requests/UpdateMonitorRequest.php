<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\MonitorMethod;
use App\Enums\MonitorType;
use App\Models\Monitor;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMonitorRequest extends FormRequest
{
    public function authorize(): bool
    {
        $monitor = $this->route('monitor');

        return $monitor instanceof Monitor
            ? ($this->user()?->can('update', $monitor) ?? false)
            : false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'type' => ['sometimes', Rule::enum(MonitorType::class)],
            'url' => ['sometimes', 'string', 'max:2048'],
            'method' => ['sometimes', Rule::enum(MonitorMethod::class)],
            'interval_seconds' => ['sometimes', 'integer', 'min:15', 'max:3600'],
            'timeout_ms' => ['sometimes', 'integer', 'min:100', 'max:60000'],
            'expected_status_code' => ['sometimes', 'integer', 'min:100', 'max:599'],
            'is_active' => ['sometimes', 'boolean'],
            'verify_ssl' => ['sometimes', 'boolean'],
        ];
    }
}
