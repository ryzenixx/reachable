<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Monitor;
use App\Models\User;
use App\Policies\Concerns\AuthorizesOrganizationAccess;

class MonitorPolicy
{
    use AuthorizesOrganizationAccess;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Monitor $monitor): bool
    {
        return $this->sameOrganization($user, $monitor->service->organization_id);
    }

    public function create(User $user): bool
    {
        return $this->isManager($user);
    }

    public function update(User $user, Monitor $monitor): bool
    {
        return $this->canManageOrganization($user, $monitor->service->organization_id);
    }

    public function delete(User $user, Monitor $monitor): bool
    {
        return $this->canManageOrganization($user, $monitor->service->organization_id);
    }

    public function restore(User $user, Monitor $monitor): bool
    {
        return false;
    }

    public function forceDelete(User $user, Monitor $monitor): bool
    {
        return false;
    }
}
