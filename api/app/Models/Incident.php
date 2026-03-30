<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\IncidentImpact;
use App\Enums\IncidentStatus;
use Database\Factories\IncidentFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Incident extends Model
{
    /** @use HasFactory<IncidentFactory> */
    use HasFactory;

    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'organization_id',
        'title',
        'status',
        'impact',
        'resolved_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => IncidentStatus::class,
            'impact' => IncidentImpact::class,
            'resolved_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function updates(): HasMany
    {
        return $this->hasMany(IncidentUpdate::class);
    }

    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'incident_services');
    }
}
