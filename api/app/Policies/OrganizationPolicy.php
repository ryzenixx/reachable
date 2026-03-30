<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\User;
use App\Policies\Concerns\AuthorizesOrganizationAccess;

class OrganizationPolicy
{
    use AuthorizesOrganizationAccess;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Organization $organization): bool
    {
        return $this->sameOrganization($user, $organization->id);
    }

    public function create(User $user): bool
    {
        return false;
    }

    public function update(User $user, Organization $organization): bool
    {
        return $this->canManageOrganization($user, $organization->id);
    }

    public function delete(User $user, Organization $organization): bool
    {
        return $this->sameOrganization($user, $organization->id) && $user->role === UserRole::Owner;
    }

    public function restore(User $user, Organization $organization): bool
    {
        return false;
    }

    public function forceDelete(User $user, Organization $organization): bool
    {
        return false;
    }
}
