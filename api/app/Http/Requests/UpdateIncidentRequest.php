<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\IncidentImpact;
use App\Enums\IncidentStatus;
use App\Models\Incident;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateIncidentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $incident = $this->route('incident');

        return $incident instanceof Incident
            ? ($this->user()?->can('update', $incident) ?? false)
            : false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', Rule::enum(IncidentStatus::class)],
            'impact' => ['sometimes', Rule::enum(IncidentImpact::class)],
            'resolved_at' => ['nullable', 'date'],
        ];
    }
}
