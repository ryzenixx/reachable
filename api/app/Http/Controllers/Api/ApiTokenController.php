<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\ApiTokens\CreateApiTokenAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\CreateApiTokenRequest;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApiTokenController extends Controller
{
    public function __construct(private readonly CreateApiTokenAction $createApiTokenAction) {}

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $tokens = $user->tokens()
            ->orderByDesc('id')
            ->get(['id', 'name', 'abilities', 'last_used_at', 'expires_at', 'created_at']);

        return response()->json($tokens);
    }

    public function store(CreateApiTokenRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validated();

        $token = $this->createApiTokenAction->execute(
            user: $user,
            name: $validated['name'],
            abilities: $validated['abilities'] ?? ['*'],
            expiresAt: isset($validated['expires_at']) ? CarbonImmutable::parse($validated['expires_at']) : null,
        );

        return response()->json([
            'token' => $token->plainTextToken,
            'name' => $token->accessToken->name,
            'expires_at' => $token->accessToken->expires_at,
        ]);
    }

    public function destroy(Request $request, int $tokenId): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $user->tokens()->where('id', $tokenId)->delete();

        return response()->json(status: 204);
    }
}
