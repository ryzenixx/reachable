<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\UptimeMetricFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UptimeMetric extends Model
{
    /** @use HasFactory<UptimeMetricFactory> */
    use HasFactory;
    use HasUuids;

    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'service_id',
        'date',
        'uptime_percentage',
        'avg_response_time_ms',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'uptime_percentage' => 'decimal:2',
            'avg_response_time_ms' => 'integer',
        ];
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }
}
