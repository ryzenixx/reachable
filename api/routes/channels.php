<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('organizations.{organizationId}', function ($user, string $organizationId): bool {
    return $user->organization_id === $organizationId;
});
