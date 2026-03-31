<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthTokenFromCookie
{
    private const COOKIE_NAME = 'reachable_session';

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->hasHeader('Authorization') && $request->cookie(self::COOKIE_NAME)) {
            $request->headers->set('Authorization', sprintf('Bearer %s', $request->cookie(self::COOKIE_NAME)));
        }

        return $next($request);
    }
}
