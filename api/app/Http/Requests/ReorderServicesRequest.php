<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Service;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReorderServicesRequest extends FormRequest
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
            'services' => ['required', 'array', 'min:1'],
            'services.*.id' => ['required', 'uuid', Rule::exists('services', 'id')],
            'services.*.order' => ['required', 'integer', 'min:0'],
        ];
    }
}
