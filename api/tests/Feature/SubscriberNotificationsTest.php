<?php

declare(strict_types=1);

use App\Enums\IncidentImpact;
use App\Enums\IncidentStatus;
use App\Mail\IncidentCreatedMail;
use App\Mail\IncidentResolvedMail;
use App\Models\Organization;
use App\Models\Service;
use App\Models\Subscriber;
use App\Services\Incidents\IncidentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

it('notifies confirmed subscribers when incidents are created and resolved', function (): void {
    Mail::fake();

    $organization = Organization::factory()->create();
    $service = Service::factory()->for($organization)->create();

    $confirmedSubscribers = Subscriber::factory()
        ->for($organization)
        ->count(2)
        ->create(['confirmed_at' => now()]);

    $unconfirmedSubscriber = Subscriber::factory()
        ->for($organization)
        ->create(['confirmed_at' => null]);

    /** @var IncidentService $incidentService */
    $incidentService = app(IncidentService::class);

    $incident = $incidentService->createIncident(
        organization: $organization,
        title: 'API outage',
        status: IncidentStatus::Investigating,
        impact: IncidentImpact::Major,
        serviceIds: [$service->id],
        initialMessage: 'We are investigating elevated error rates.',
    );

    Mail::assertSent(IncidentCreatedMail::class, 2);

    foreach ($confirmedSubscribers as $subscriber) {
        Mail::assertSent(IncidentCreatedMail::class, static fn (IncidentCreatedMail $mail): bool => $mail->hasTo($subscriber->email));
    }

    Mail::assertNotSent(IncidentCreatedMail::class, static fn (IncidentCreatedMail $mail): bool => $mail->hasTo($unconfirmedSubscriber->email));

    $incidentService->updateIncident($incident, IncidentStatus::Resolved);

    Mail::assertSent(IncidentResolvedMail::class, 2);

    foreach ($confirmedSubscribers as $subscriber) {
        Mail::assertSent(IncidentResolvedMail::class, static fn (IncidentResolvedMail $mail): bool => $mail->hasTo($subscriber->email));
    }

    Mail::assertNotSent(IncidentResolvedMail::class, static fn (IncidentResolvedMail $mail): bool => $mail->hasTo($unconfirmedSubscriber->email));
});
