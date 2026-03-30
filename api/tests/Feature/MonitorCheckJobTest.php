<?php

declare(strict_types=1);

use App\Enums\IncidentImpact;
use App\Enums\IncidentStatus;
use App\Enums\MonitorCheckStatus;
use App\Enums\MonitorMethod;
use App\Enums\MonitorType;
use App\Enums\ServiceStatus;
use App\Jobs\RunMonitorCheck;
use App\Models\Incident;
use App\Models\Monitor;
use App\Models\Organization;
use App\Models\Service;
use App\Services\Incidents\IncidentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    config()->set('reachable.monitoring.allow_private_targets', true);
});

it('records a successful monitor check result', function (): void {
    Http::fake([
        '*' => Http::response(status: 200),
    ]);

    $organization = Organization::factory()->create();
    $service = Service::factory()->for($organization)->create([
        'status' => ServiceStatus::Operational,
    ]);

    $monitor = Monitor::factory()->for($service)->create([
        'type' => MonitorType::Http,
        'url' => 'https://reachable.test/health',
        'method' => MonitorMethod::GET,
        'expected_status_code' => 200,
        'is_active' => true,
    ]);

    RunMonitorCheck::dispatchSync($monitor->id);

    $this->assertDatabaseHas('monitor_checks', [
        'monitor_id' => $monitor->id,
        'status' => MonitorCheckStatus::Up->value,
        'status_code' => 200,
    ]);

    $service->refresh();
    expect($service->status)->toBe(ServiceStatus::Operational);
});

it('auto-creates an incident after two consecutive monitor failures', function (): void {
    Http::fake([
        '*' => static function (): never {
            throw new RuntimeException('Unable to reach endpoint.');
        },
    ]);

    $organization = Organization::factory()->create();
    $service = Service::factory()->for($organization)->create([
        'name' => 'API Gateway',
        'status' => ServiceStatus::Operational,
    ]);

    $monitor = Monitor::factory()->for($service)->create([
        'type' => MonitorType::Http,
        'url' => 'https://reachable.test/down',
        'method' => MonitorMethod::GET,
        'expected_status_code' => 200,
        'is_active' => true,
    ]);

    RunMonitorCheck::dispatchSync($monitor->id);
    expect(Incident::query()->count())->toBe(0);

    RunMonitorCheck::dispatchSync($monitor->id);

    /** @var Incident|null $incident */
    $incident = Incident::query()
        ->where('organization_id', $organization->id)
        ->where('title', 'Auto incident: API Gateway monitor failure')
        ->first();

    expect($incident)->not->toBeNull();
    expect($incident?->status)->toBe(IncidentStatus::Investigating);

    $service->refresh();
    expect($service->status)->toBe(ServiceStatus::MajorOutage);

    $this->assertDatabaseHas('incident_services', [
        'incident_id' => (string) $incident?->id,
        'service_id' => $service->id,
    ]);
});

it('marks linked services operational when an incident update resolves the incident', function (): void {
    $organization = Organization::factory()->create();
    $service = Service::factory()->for($organization)->create([
        'status' => ServiceStatus::MajorOutage,
    ]);

    /** @var IncidentService $incidentService */
    $incidentService = app(IncidentService::class);

    $incident = $incidentService->createIncident(
        organization: $organization,
        title: 'API outage',
        status: IncidentStatus::Investigating,
        impact: IncidentImpact::Major,
        serviceIds: [$service->id],
        initialMessage: 'Investigating elevated 5xx responses.',
    );

    $incidentService->addUpdate(
        incident: $incident,
        status: IncidentStatus::Resolved,
        message: 'Recovery confirmed and monitoring complete.',
    );

    $service->refresh();
    expect($service->status)->toBe(ServiceStatus::Operational);

    $incident->refresh();
    expect($incident->status)->toBe(IncidentStatus::Resolved);
    expect($incident->resolved_at)->not->toBeNull();
});
