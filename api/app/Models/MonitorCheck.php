<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\MonitorCheckStatus;
use Database\Factories\MonitorCheckFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonitorCheck extends Model
{
    /** @use HasFactory<MonitorCheckFactory> */
    use HasFactory;

    use HasUuids;

    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'monitor_id',
        'status',
        'response_time_ms',
        'status_code',
        'error_message',
        'checked_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => MonitorCheckStatus::class,
            'response_time_ms' => 'integer',
            'status_code' => 'integer',
            'checked_at' => 'datetime',
        ];
    }

    public function monitor(): BelongsTo
    {
        return $this->belongsTo(Monitor::class);
    }
}
