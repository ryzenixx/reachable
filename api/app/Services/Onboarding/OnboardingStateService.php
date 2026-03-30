<?php

declare(strict_types=1);

namespace App\Services\Onboarding;

use App\Models\Organization;
use App\Models\User;

class OnboardingStateService
{
    public function isInitialized(): bool
    {
        return Organization::query()->exists() || User::query()->exists();
    }
}
