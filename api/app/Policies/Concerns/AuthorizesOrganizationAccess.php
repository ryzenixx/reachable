<?php

declare(strict_types=1);

namespace App\Policies\Concerns;

use App\Enums\UserRole;
use App\Models\User;

trait AuthorizesOrganizationAccess
{
    protected function sameOrganization(User $user, string $organizationId): bool
    {
        return $user->organization_id === $organizationId;
    }

    protected function canManageOrganization(User $user, string $organizationId): bool
    {
        if (! $this->sameOrganization($user, $organizationId)) {
            return false;
        }

        return $this->isManager($user);
    }

    protected function isManager(User $user): bool
    {
        return in_array($user->role, [UserRole::Owner, UserRole::Admin], true);
    }
}
