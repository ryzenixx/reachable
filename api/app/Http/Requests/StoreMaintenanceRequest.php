<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\MaintenanceStatus;
use App\Models\Maintenance;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMaintenanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Maintenance::class) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:5000'],
            'scheduled_at' => ['required', 'date'],
            'ended_at' => ['nullable', 'date', 'after_or_equal:scheduled_at'],
            'status' => ['required', Rule::enum(MaintenanceStatus::class)],
        ];
    }
}
