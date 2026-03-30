<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\ServiceStatus;
use App\Models\Service;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $service = $this->route('service');

        return $service instanceof Service
            ? ($this->user()?->can('update', $service) ?? false)
            : false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', Rule::enum(ServiceStatus::class)],
            'order' => ['sometimes', 'integer', 'min:0'],
            'is_public' => ['sometimes', 'boolean'],
        ];
    }
}
