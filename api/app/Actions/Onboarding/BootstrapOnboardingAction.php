<?php

declare(strict_types=1);

namespace App\Actions\Onboarding;

use App\Actions\ApiTokens\CreateApiTokenAction;
use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\User;
use App\Services\Onboarding\OnboardingStateService;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class BootstrapOnboardingAction
{
    public function __construct(
        private readonly CreateApiTokenAction $createApiTokenAction,
        private readonly OnboardingStateService $onboardingStateService,
    ) {}

    /**
     * @param array{
     *   organization_name: string,
     *   owner_name: string,
     *   owner_email: string,
     *   owner_password: string,
     *   device_name?: string
     * } $data
     * @return array{
     *   token: string,
     *   user: User
     * }
     */
    public function execute(array $data): array
    {
        try {
            return Cache::lock('reachable:onboarding:bootstrap', 10)
                ->block(5, function () use ($data): array {
                    return DB::transaction(function () use ($data): array {
                        if ($this->onboardingStateService->isInitialized()) {
                            throw new RuntimeException('Onboarding has already been completed.');
                        }

                        /** @var Organization $organization */
                        $organization = Organization::query()->create([
                            'name' => $data['organization_name'],
                            'logo_url' => null,
                            'banner_url' => null,
                            'custom_domain' => null,
                            'smtp_enabled' => false,
                            'smtp_host' => null,
                            'smtp_port' => null,
                            'smtp_username' => null,
                            'smtp_password' => null,
                            'smtp_encryption' => null,
                            'smtp_from_address' => null,
                            'smtp_from_name' => null,
                        ]);

                        /** @var User $user */
                        $user = User::query()->create([
                            'organization_id' => $organization->id,
                            'name' => $data['owner_name'],
                            'email' => $data['owner_email'],
                            'password' => $data['owner_password'],
                            'role' => UserRole::Owner,
                            'email_verified_at' => now(),
                        ]);

                        $token = $this->createApiTokenAction->execute(
                            user: $user,
                            name: $data['device_name'] ?? 'onboarding',
                        );

                        $user->loadMissing('organization');

                        return [
                            'token' => $token->plainTextToken,
                            'user' => $user,
                        ];
                    });
                });
        } catch (LockTimeoutException) {
            throw new RuntimeException('Onboarding setup is currently in progress. Please retry in a moment.');
        }
    }
}
