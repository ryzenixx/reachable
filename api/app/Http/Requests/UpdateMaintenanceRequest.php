<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\MaintenanceStatus;
use App\Models\Maintenance;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMaintenanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $maintenance = $this->route('maintenance');

        return $maintenance instanceof Maintenance
            ? ($this->user()?->can('update', $maintenance) ?? false)
            : false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'string', 'max:5000'],
            'scheduled_at' => ['sometimes', 'date'],
            'ended_at' => ['nullable', 'date'],
            'status' => ['sometimes', Rule::enum(MaintenanceStatus::class)],
        ];
    }
}
