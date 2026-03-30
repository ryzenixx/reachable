<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Organization;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class DeleteOrganizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $organization = $this->route('organization');

        return $organization instanceof Organization
            ? ($this->user()?->can('delete', $organization) ?? false)
            : false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'confirmation_name' => ['required', 'string', 'max:255'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator): void {
            $organization = $this->route('organization');

            if (! $organization instanceof Organization) {
                return;
            }

            if ($this->string('confirmation_name')->toString() !== $organization->name) {
                $validator->errors()->add('confirmation_name', 'Organization name confirmation does not match.');
            }
        });
    }
}
