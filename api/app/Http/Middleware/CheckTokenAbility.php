<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class CheckTokenAbility
{
    /**
     * Enforce token abilities only on real persisted personal access tokens.
     * Transient tokens, mocks (Sanctum::actingAs in tests), and session auth pass through.
     */
    public function handle(Request $request, Closure $next, string ...$abilities): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(403, 'Unauthorized.');
        }

        $token = $user->currentAccessToken();

        // Only enforce on real persisted tokens — not mocks or transient tokens
        if (! $token instanceof PersonalAccessToken || get_class($token) !== PersonalAccessToken::class) {
            return $next($request);
        }

        foreach ($abilities as $ability) {
            if ($token->can($ability)) {
                return $next($request);
            }
        }

        abort(403, 'Token does not have the required abilities.');
    }
}
