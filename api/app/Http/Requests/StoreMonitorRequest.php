<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\MonitorMethod;
use App\Enums\MonitorType;
use App\Models\Monitor;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMonitorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Monitor::class) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'service_id' => ['required', 'uuid', Rule::exists('services', 'id')],
            'type' => ['required', Rule::enum(MonitorType::class)],
            'url' => ['required', 'string', 'max:2048'],
            'method' => ['required', Rule::enum(MonitorMethod::class)],
            'interval_seconds' => ['nullable', 'integer', 'min:15', 'max:3600'],
            'timeout_ms' => ['nullable', 'integer', 'min:100', 'max:60000'],
            'expected_status_code' => ['nullable', 'integer', 'min:100', 'max:599'],
            'is_active' => ['nullable', 'boolean'],
            'verify_ssl' => ['nullable', 'boolean'],
        ];
    }
}
