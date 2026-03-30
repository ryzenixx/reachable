<?php

declare(strict_types=1);

namespace App\Actions\ApiTokens;

use App\Models\User;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\NewAccessToken;

class CreateApiTokenAction
{
    /**
     * @param list<string> $abilities
     */
    public function execute(User $user, string $name, array $abilities = ['*'], ?Carbon $expiresAt = null): NewAccessToken
    {
        return $user->createToken(
            name: $name,
            abilities: $abilities,
            expiresAt: $expiresAt,
        );
    }
}
