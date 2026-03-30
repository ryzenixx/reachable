<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Organization;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateOrganizationSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        $organization = $this->route('organization');

        return $organization instanceof Organization
            ? ($this->user()?->can('update', $organization) ?? false)
            : false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'logo_url' => ['nullable', 'url', 'max:2048'],
            'banner_url' => ['nullable', 'url', 'max:2048'],
            'custom_domain' => ['nullable', 'string', 'max:255'],
            'smtp_enabled' => ['required', 'boolean'],
            'smtp_host' => [
                'nullable',
                'string',
                'max:255',
                Rule::requiredIf($this->boolean('smtp_enabled')),
            ],
            'smtp_port' => [
                'nullable',
                'integer',
                'between:1,65535',
                Rule::requiredIf($this->boolean('smtp_enabled')),
            ],
            'smtp_username' => ['nullable', 'string', 'max:255'],
            'smtp_password' => ['nullable', 'string', 'max:255'],
            'smtp_encryption' => ['nullable', Rule::in(['none', 'tls', 'ssl'])],
            'smtp_from_address' => [
                'nullable',
                'email:rfc',
                'max:255',
                Rule::requiredIf($this->boolean('smtp_enabled')),
            ],
            'smtp_from_name' => ['nullable', 'string', 'max:255'],
        ];
    }
}
