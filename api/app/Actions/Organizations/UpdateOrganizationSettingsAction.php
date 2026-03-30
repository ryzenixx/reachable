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

        $organization->fill($payload);
        $organization->save();

        return $organization->refresh();
    }
}
