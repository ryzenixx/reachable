<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Concerns;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\Request;

trait ResolvesAuthenticatedContext
{
    private function authenticatedUser(Request $request): User
    {
        $user = $request->user();

        if (! $user instanceof User) {
            abort(401, 'Unauthenticated.');
        }

        return $user;
    }

    private function organizationId(Request $request): string
    {
        return $this->authenticatedUser($request)->organization_id;
    }

    private function organization(Request $request): Organization
    {
        $organization = $this->authenticatedUser($request)->organization;

        if (! $organization instanceof Organization) {
            abort(403, 'Organization is not available.');
        }

        return $organization;
    }
}
