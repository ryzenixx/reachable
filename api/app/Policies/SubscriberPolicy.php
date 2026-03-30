<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Subscriber;
use App\Models\User;
use App\Policies\Concerns\AuthorizesOrganizationAccess;

class SubscriberPolicy
{
    use AuthorizesOrganizationAccess;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Subscriber $subscriber): bool
    {
        return $this->sameOrganization($user, $subscriber->organization_id);
    }

    public function create(User $user): bool
    {
        return $this->isManager($user);
    }

    public function update(User $user, Subscriber $subscriber): bool
    {
        return $this->canManageOrganization($user, $subscriber->organization_id);
    }

    public function delete(User $user, Subscriber $subscriber): bool
    {
        return $this->canManageOrganization($user, $subscriber->organization_id);
    }

    public function restore(User $user, Subscriber $subscriber): bool
    {
        return false;
    }

    public function forceDelete(User $user, Subscriber $subscriber): bool
    {
        return false;
    }
}
