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

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/auth/logout-all', [AuthController::class, 'logoutAll']);

        Route::get('/services', [StatusController::class, 'services']);
        Route::get('/status', [StatusController::class, 'summary']);

        Route::apiResource('dashboard/services', ServiceController::class);
        Route::post('dashboard/services/reorder', [ServiceController::class, 'reorder']);

        Route::apiResource('dashboard/monitors', MonitorController::class);
        Route::get('dashboard/monitors/{monitor}/checks', [MonitorController::class, 'checks']);

        Route::apiResource('incidents', IncidentController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
        Route::post('incidents/{incident}/updates', [IncidentController::class, 'addUpdate']);

        Route::apiResource('dashboard/maintenances', MaintenanceController::class);
        Route::post('dashboard/maintenances/{maintenance}/complete', [MaintenanceController::class, 'complete']);

        Route::get('dashboard/subscribers', [SubscriberController::class, 'index']);
        Route::post('dashboard/subscribers', [SubscriberController::class, 'store']);
        Route::delete('dashboard/subscribers/{subscriber}', [SubscriberController::class, 'destroy']);
        Route::get('dashboard/subscribers-export', [SubscriberController::class, 'export']);

        Route::get('dashboard/settings/organization', [OrganizationSettingsController::class, 'show']);
        Route::patch('dashboard/settings/organization/{organization}', [OrganizationSettingsController::class, 'update']);
        Route::delete('dashboard/settings/organization/{organization}', [OrganizationSettingsController::class, 'destroy']);
        Route::get('dashboard/system/version', [SystemVersionController::class, 'show']);

        Route::get('dashboard/tokens', [ApiTokenController::class, 'index']);
        Route::post('dashboard/tokens', [ApiTokenController::class, 'store']);
        Route::delete('dashboard/tokens/{tokenId}', [ApiTokenController::class, 'destroy']);

        Route::get('/uptime/{serviceId}', [UptimeController::class, 'show']);
    });
});
