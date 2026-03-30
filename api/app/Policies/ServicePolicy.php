<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Service;
use App\Models\User;
use App\Policies\Concerns\AuthorizesOrganizationAccess;

class ServicePolicy
{
    use AuthorizesOrganizationAccess;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Service $service): bool
    {
        return $this->sameOrganization($user, $service->organization_id);
    }

    public function create(User $user): bool
    {
        return $this->isManager($user);
    }

    public function update(User $user, Service $service): bool
    {
        return $this->canManageOrganization($user, $service->organization_id);
    }

    public function delete(User $user, Service $service): bool
    {
        return $this->canManageOrganization($user, $service->organization_id);
    }

    public function restore(User $user, Service $service): bool
    {
        return false;
    }

    public function forceDelete(User $user, Service $service): bool
    {
        return false;
    }
}
