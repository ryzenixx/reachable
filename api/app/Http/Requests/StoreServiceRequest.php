<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\ServiceStatus;
use App\Models\Service;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Service::class) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::enum(ServiceStatus::class)],
            'order' => ['nullable', 'integer', 'min:0'],
            'is_public' => ['nullable', 'boolean'],
        ];
    }
}
