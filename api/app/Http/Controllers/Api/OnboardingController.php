<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Onboarding\BootstrapOnboardingAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\BootstrapOnboardingRequest;
use App\Http\Resources\OrganizationResource;
use App\Models\User;
use App\Services\Onboarding\OnboardingStateService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class OnboardingController extends Controller
{
    public function __construct(
        private readonly OnboardingStateService $onboardingStateService,
        private readonly BootstrapOnboardingAction $bootstrapOnboardingAction,
    ) {
    }

    public function state(): JsonResponse
    {
        return response()->json([
            'initialized' => $this->onboardingStateService->isInitialized(),
        ]);
    }

    public function bootstrap(BootstrapOnboardingRequest $request): JsonResponse
    {
        if ($this->onboardingStateService->isInitialized()) {
            return response()->json([
                'message' => 'Onboarding has already been completed.',
            ], 409);
        }

        try {
            $result = $this->bootstrapOnboardingAction->execute($request->validated());
        } catch (RuntimeException) {
            return response()->json([
                'message' => 'Onboarding has already been completed.',
            ], 409);
        }

        /** @var User $user */
        $user = $result['user'];

        return response()->json([
            'token' => $result['token'],
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value,
                'organization' => new OrganizationResource($user->organization),
            ],
        ], 201);
    }
}
