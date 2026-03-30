<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\Incident;
use App\Models\Maintenance;
use App\Models\Monitor;
use App\Models\Organization;
use App\Models\Service;
use App\Models\Subscriber;
use App\Policies\IncidentPolicy;
use App\Policies\MaintenancePolicy;
use App\Policies\MonitorPolicy;
use App\Policies\OrganizationPolicy;
use App\Policies\ServicePolicy;
use App\Policies\SubscriberPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('auth-login', static function (Request $request): array {
            $email = mb_strtolower((string) $request->input('email'));

            return [
                Limit::perMinute(6)->by(sprintf('%s|%s', $email, $request->ip())),
                Limit::perMinute(30)->by($request->ip()),
            ];
        });

        RateLimiter::for('onboarding-bootstrap', static function (Request $request): array {
            return [
                Limit::perMinute(2)->by($request->ip()),
                Limit::perHour(10)->by($request->ip()),
            ];
        });

        RateLimiter::for('public-subscribe', static function (Request $request): array {
            return [
                Limit::perMinute(5)->by($request->ip()),
                Limit::perHour(30)->by($request->ip()),
            ];
        });

        RateLimiter::for('public-confirm', static function (Request $request): array {
            return [
                Limit::perMinute(20)->by($request->ip()),
                Limit::perHour(200)->by($request->ip()),
            ];
        });

        RateLimiter::for('public-unsubscribe', static function (Request $request): array {
            return [
                Limit::perMinute(20)->by($request->ip()),
                Limit::perHour(200)->by($request->ip()),
            ];
        });

        Gate::policy(Organization::class, OrganizationPolicy::class);
        Gate::policy(Service::class, ServicePolicy::class);
        Gate::policy(Monitor::class, MonitorPolicy::class);
        Gate::policy(Incident::class, IncidentPolicy::class);
        Gate::policy(Maintenance::class, MaintenancePolicy::class);
        Gate::policy(Subscriber::class, SubscriberPolicy::class);
    }
}
