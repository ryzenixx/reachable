<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\MonitorMethod;
use App\Enums\MonitorType;
use Database\Factories\MonitorFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Monitor extends Model
{
    /** @use HasFactory<MonitorFactory> */
    use HasFactory;
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'service_id',
        'type',
        'url',
        'method',
        'interval_seconds',
        'timeout_ms',
        'expected_status_code',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => MonitorType::class,
            'method' => MonitorMethod::class,
            'interval_seconds' => 'integer',
            'timeout_ms' => 'integer',
            'expected_status_code' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function checks(): HasMany
    {
        return $this->hasMany(MonitorCheck::class);
    }

    public function latestCheck(): HasOne
    {
        return $this->hasOne(MonitorCheck::class)->orderByDesc('checked_at');
    }
}
