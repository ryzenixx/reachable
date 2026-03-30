<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Laravel\Horizon\HorizonApplicationServiceProvider;

class HorizonServiceProvider extends HorizonApplicationServiceProvider
{
    public function boot(): void
    {
        parent::boot();
    }

    protected function gate(): void
    {
        $allowedEmails = array_values(array_filter(
            array_map(
                static fn (string $email): string => trim($email),
                explode(',', (string) env('HORIZON_ALLOWED_EMAILS', ''))
            ),
            static fn (string $email): bool => $email !== ''
        ));

        Gate::define('viewHorizon', static function ($user = null) use ($allowedEmails): bool {
            if (app()->environment('local')) {
                return true;
            }

            if (! is_object($user) || ! isset($user->email) || ! is_string($user->email)) {
                return false;
            }

            return in_array($user->email, $allowedEmails, true);
        });
    }
}
