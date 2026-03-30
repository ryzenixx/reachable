<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\OrganizationFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    /** @use HasFactory<OrganizationFactory> */
    use HasFactory;

    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'logo_url',
        'banner_url',
        'custom_domain',
        'smtp_enabled',
        'smtp_host',
        'smtp_port',
        'smtp_username',
        'smtp_password',
        'smtp_encryption',
        'smtp_from_address',
        'smtp_from_name',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'smtp_password',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'smtp_enabled' => 'boolean',
            'smtp_port' => 'integer',
            'smtp_password' => 'encrypted',
        ];
    }

    public function publicBaseUrl(): string
    {
        $customDomain = is_string($this->custom_domain) ? trim($this->custom_domain) : '';

        if ($customDomain !== '') {
            return self::normalizeBaseUrl($customDomain);
        }

        $fallback = (string) config('app.frontend_url', config('app.url', 'http://localhost:3000'));

        return self::normalizeBaseUrl($fallback);
    }

    private static function normalizeBaseUrl(string $value): string
    {
        $trimmed = trim($value);

        if ($trimmed === '') {
            return 'http://localhost:3000';
        }

        if (! preg_match('/^https?:\/\//i', $trimmed)) {
            $trimmed = sprintf('https://%s', $trimmed);
        }

        return rtrim($trimmed, '/');
    }

    public function hasCustomSmtpConfiguration(): bool
    {
        return $this->smtp_enabled
            && is_string($this->smtp_host)
            && mb_strlen($this->smtp_host) > 0
            && is_int($this->smtp_port)
            && $this->smtp_port > 0
            && is_string($this->smtp_from_address)
            && mb_strlen($this->smtp_from_address) > 0;
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }

    public function incidents(): HasMany
    {
        return $this->hasMany(Incident::class);
    }

    public function maintenances(): HasMany
    {
        return $this->hasMany(Maintenance::class);
    }

    public function subscribers(): HasMany
    {
        return $this->hasMany(Subscriber::class);
    }
}
