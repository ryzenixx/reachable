<?php

declare(strict_types=1);

namespace App\Services\Mail;

use App\Models\Organization;
use Illuminate\Contracts\Mail\Mailer;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;

class OrganizationMailerFactory
{
    public function make(Organization $organization): Mailer
    {
        if (! $organization->hasCustomSmtpConfiguration()) {
            /** @var string $defaultMailer */
            $defaultMailer = (string) config('mail.default', 'smtp');

            return Mail::mailer($defaultMailer);
        }

        $mailerName = sprintf('organization-smtp-%s', str_replace('-', '', $organization->id));

        Config::set("mail.mailers.{$mailerName}", $this->smtpConfig($organization));
        Mail::purge($mailerName);

        return Mail::mailer($mailerName);
    }

    /**
     * @return array<string, mixed>
     */
    private function smtpConfig(Organization $organization): array
    {
        $fromAddress = (string) $organization->smtp_from_address;
        $fromName = $organization->smtp_from_name ?? $organization->name;
        $scheme = $this->smtpScheme($organization->smtp_encryption, $organization->smtp_port);

        return [
            'transport' => 'smtp',
            'host' => (string) $organization->smtp_host,
            'port' => (int) $organization->smtp_port,
            'username' => $organization->smtp_username,
            'password' => $organization->smtp_password,
            'scheme' => $scheme,
            'timeout' => 15,
            'local_domain' => parse_url((string) config('app.url', 'http://localhost'), PHP_URL_HOST) ?: 'localhost',
            'from' => [
                'address' => $fromAddress,
                'name' => $fromName,
            ],
        ];
    }

    private function smtpScheme(?string $encryption, ?int $port): string
    {
        $normalized = is_string($encryption) ? strtolower(trim($encryption)) : '';

        return match ($normalized) {
            'ssl' => 'smtps',
            'tls', 'none' => 'smtp',
            default => $port === 465 ? 'smtps' : 'smtp',
        };
    }
}
