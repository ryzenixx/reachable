<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\SubscriberFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscriber extends Model
{
    /** @use HasFactory<SubscriberFactory> */
    use HasFactory;

    use HasUuids;

    public const UPDATED_AT = null;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'organization_id',
        'email',
        'token',
        'confirmed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'confirmed_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
