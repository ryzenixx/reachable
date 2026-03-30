<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\IncidentImpact;
use App\Enums\IncidentStatus;
use App\Models\Incident;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreIncidentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Incident::class) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $organizationId = $this->user()?->organization_id;

        return [
            'title' => ['required', 'string', 'max:255'],
            'status' => ['required', Rule::enum(IncidentStatus::class)],
            'impact' => ['required', Rule::enum(IncidentImpact::class)],
            'service_ids' => ['nullable', 'array'],
            'service_ids.*' => [
                'required',
                'uuid',
                Rule::exists('services', 'id')->where(static function (QueryBuilder $query) use ($organizationId): void {
                    if (! is_string($organizationId) || $organizationId === '') {
                        $query->whereRaw('1 = 0');

                        return;
                    }

                    $query->where('organization_id', $organizationId);
                }),
            ],
        ];
    }
}
