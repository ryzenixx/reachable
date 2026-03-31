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
     * Transient tokens, mocks (tests), and session auth are allowed through.
     */
    public function handle(Request $request, Closure $next, string ...$abilities): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(403, 'Unauthorized.');
        }

        $token = $user->currentAccessToken();

        if (! $token instanceof PersonalAccessToken || $token->getKey() === null) {
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
