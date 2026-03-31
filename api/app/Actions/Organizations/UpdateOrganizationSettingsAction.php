<?php

declare(strict_types=1);

namespace App\Actions\Organizations;

use App\Models\Organization;

class UpdateOrganizationSettingsAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Organization $organization, array $data): Organization
    {
        $payload = $data;

        if (array_key_exists('custom_domain', $payload)) {
            $customDomain = is_string($payload['custom_domain']) ? trim($payload['custom_domain']) : '';
            $payload['custom_domain'] = $customDomain === '' ? null : $customDomain;
        }

        if (array_key_exists('smtp_password', $payload)) {
            $smtpPassword = is_string($payload['smtp_password']) ? trim($payload['smtp_password']) : '';

            if ($smtpPassword === '') {
                unset($payload['smtp_password']);
            } else {
                $payload['smtp_password'] = $smtpPassword;
            }
        }

        if (array_key_exists('hcaptcha_secret', $payload)) {
            $hcaptchaSecret = is_string($payload['hcaptcha_secret']) ? trim($payload['hcaptcha_secret']) : '';

            if ($hcaptchaSecret === '') {
                unset($payload['hcaptcha_secret']);
            } else {
                $payload['hcaptcha_secret'] = $hcaptchaSecret;
            }
        }

        if (array_key_exists('hcaptcha_sitekey', $payload)) {
            $sitekey = is_string($payload['hcaptcha_sitekey']) ? trim($payload['hcaptcha_sitekey']) : '';
            $payload['hcaptcha_sitekey'] = $sitekey === '' ? null : $sitekey;

            if ($sitekey === '') {
                $payload['hcaptcha_secret'] = null;
            }
        }

        $organization->fill($payload);
        $organization->save();

        return $organization->refresh();
    }
}
