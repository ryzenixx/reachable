<?php

declare(strict_types=1);

use App\Http\Controllers\Api\ApiTokenController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\IncidentController;
use App\Http\Controllers\Api\MaintenanceController;
use App\Http\Controllers\Api\MonitorController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\OrganizationSettingsController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\StatusController;
use App\Http\Controllers\Api\SubscriberController;
use App\Http\Controllers\Api\SystemVersionController;
use App\Http\Controllers\Api\UptimeController;
use App\Http\Controllers\PublicStatusController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/onboarding/state', [OnboardingController::class, 'state']);
    Route::post('/onboarding/bootstrap', [OnboardingController::class, 'bootstrap'])
        ->middleware('throttle:onboarding-bootstrap');

    Route::post('/auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:auth-login');

    Route::get('/public', [PublicStatusController::class, 'show']);
    Route::get('/public/incidents/{incidentId}', [PublicStatusController::class, 'incident']);
    Route::post('/public/subscribe', [PublicStatusController::class, 'subscribe'])
        ->middleware('throttle:public-subscribe');
    Route::post('/public/subscribe/confirm/{token}', [PublicStatusController::class, 'confirm'])
        ->middleware('throttle:public-confirm');
    Route::delete('/public/unsubscribe/{token}', [PublicStatusController::class, 'unsubscribe'])
        ->middleware('throttle:public-unsubscribe');

    Route::middleware(['auth:sanctum', 'throttle:authenticated'])->group(function (): void {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/auth/logout-all', [AuthController::class, 'logoutAll']);

        // Read — requires 'read' or '*' ability
        Route::middleware('ability:read,*')->group(function (): void {
            Route::get('/services', [StatusController::class, 'services']);
            Route::get('/status', [StatusController::class, 'summary']);
            Route::get('dashboard/services', [ServiceController::class, 'index']);
            Route::get('dashboard/services/{service}', [ServiceController::class, 'show']);
            Route::get('dashboard/monitors', [MonitorController::class, 'index']);
            Route::get('dashboard/monitors/{monitor}', [MonitorController::class, 'show']);
            Route::get('dashboard/monitors/{monitor}/checks', [MonitorController::class, 'checks']);
            Route::get('incidents', [IncidentController::class, 'index']);
            Route::get('incidents/{incident}', [IncidentController::class, 'show']);
            Route::get('dashboard/maintenances', [MaintenanceController::class, 'index']);
            Route::get('dashboard/maintenances/{maintenance}', [MaintenanceController::class, 'show']);
            Route::get('dashboard/subscribers', [SubscriberController::class, 'index']);
            Route::get('dashboard/subscribers-export', [SubscriberController::class, 'export']);
            Route::get('/uptime/{serviceId}', [UptimeController::class, 'show']);
            Route::get('dashboard/system/version', [SystemVersionController::class, 'show']);
            Route::get('dashboard/settings/organization', [OrganizationSettingsController::class, 'show']);
            Route::get('dashboard/tokens', [ApiTokenController::class, 'index']);
        });

        // Write — requires 'write' or '*' ability
        Route::middleware('ability:write,*')->group(function (): void {
            Route::post('dashboard/services', [ServiceController::class, 'store']);
            Route::put('dashboard/services/{service}', [ServiceController::class, 'update']);
            Route::patch('dashboard/services/{service}', [ServiceController::class, 'update']);
            Route::delete('dashboard/services/{service}', [ServiceController::class, 'destroy']);
            Route::post('dashboard/services/reorder', [ServiceController::class, 'reorder']);

            Route::post('dashboard/monitors', [MonitorController::class, 'store']);
            Route::put('dashboard/monitors/{monitor}', [MonitorController::class, 'update']);
            Route::patch('dashboard/monitors/{monitor}', [MonitorController::class, 'update']);
            Route::delete('dashboard/monitors/{monitor}', [MonitorController::class, 'destroy']);

            Route::post('incidents', [IncidentController::class, 'store']);
            Route::put('incidents/{incident}', [IncidentController::class, 'update']);
            Route::patch('incidents/{incident}', [IncidentController::class, 'update']);
            Route::delete('incidents/{incident}', [IncidentController::class, 'destroy']);
            Route::post('incidents/{incident}/updates', [IncidentController::class, 'addUpdate']);

            Route::post('dashboard/maintenances', [MaintenanceController::class, 'store']);
            Route::put('dashboard/maintenances/{maintenance}', [MaintenanceController::class, 'update']);
            Route::patch('dashboard/maintenances/{maintenance}', [MaintenanceController::class, 'update']);
            Route::delete('dashboard/maintenances/{maintenance}', [MaintenanceController::class, 'destroy']);
            Route::post('dashboard/maintenances/{maintenance}/complete', [MaintenanceController::class, 'complete']);

            Route::post('dashboard/subscribers', [SubscriberController::class, 'store']);
            Route::delete('dashboard/subscribers/{subscriber}', [SubscriberController::class, 'destroy']);

            Route::post('dashboard/tokens', [ApiTokenController::class, 'store']);
            Route::delete('dashboard/tokens/{tokenId}', [ApiTokenController::class, 'destroy']);
        });

        // Settings — requires 'settings' or '*' ability
        Route::middleware('ability:settings,*')->group(function (): void {
            Route::patch('dashboard/settings/organization/{organization}', [OrganizationSettingsController::class, 'update']);
            Route::delete('dashboard/settings/organization/{organization}', [OrganizationSettingsController::class, 'destroy']);
        });
    });
});
