<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Maintenance;
use App\Models\User;
use App\Policies\Concerns\AuthorizesOrganizationAccess;

class MaintenancePolicy
{
    use AuthorizesOrganizationAccess;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Maintenance $maintenance): bool
    {
        return $this->sameOrganization($user, $maintenance->organization_id);
    }

    public function create(User $user): bool
    {
        return $this->isManager($user);
    }

    public function update(User $user, Maintenance $maintenance): bool
    {
        return $this->canManageOrganization($user, $maintenance->organization_id);
    }

    public function delete(User $user, Maintenance $maintenance): bool
    {
        return $this->canManageOrganization($user, $maintenance->organization_id);
    }

    public function restore(User $user, Maintenance $maintenance): bool
    {
        return false;
    }

    public function forceDelete(User $user, Maintenance $maintenance): bool
    {
        return false;
    }
}
