<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Incident;
use App\Models\User;
use App\Policies\Concerns\AuthorizesOrganizationAccess;

class IncidentPolicy
{
    use AuthorizesOrganizationAccess;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Incident $incident): bool
    {
        return $this->sameOrganization($user, $incident->organization_id);
    }

    public function create(User $user): bool
    {
        return $this->isManager($user);
    }

    public function update(User $user, Incident $incident): bool
    {
        return $this->canManageOrganization($user, $incident->organization_id);
    }

    public function delete(User $user, Incident $incident): bool
    {
        return $this->canManageOrganization($user, $incident->organization_id);
    }

    public function restore(User $user, Incident $incident): bool
    {
        return false;
    }

    public function forceDelete(User $user, Incident $incident): bool
    {
        return false;
    }
}
