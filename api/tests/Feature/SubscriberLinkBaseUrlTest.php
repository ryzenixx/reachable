<?php

declare(strict_types=1);

use App\Actions\Subscribers\CreateSubscriberAction;
use App\Enums\IncidentImpact;
use App\Enums\IncidentStatus;
use App\Mail\IncidentCreatedMail;
use App\Mail\IncidentResolvedMail;
use App\Mail\SubscriptionConfirmationMail;
use App\Models\Organization;
use App\Models\Service;
use App\Models\Subscriber;
use App\Services\Incidents\IncidentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

it('uses organization custom domain for subscriber links in outgoing emails', function (): void {
    Mail::fake();

    $organization = Organization::factory()->create([
        'custom_domain' => 'status.example.com',
    ]);

    $createSubscriberAction = app(CreateSubscriberAction::class);
    $pendingSubscriber = $createSubscriberAction->execute(
        organization: $organization,
        email: 'alerts@example.com',
    );

    Mail::assertSent(
        SubscriptionConfirmationMail::class,
        static fn (SubscriptionConfirmationMail $mail): bool => $mail->confirmUrl === sprintf(
            'https://status.example.com/subscribe/confirm?token=%s',
            $pendingSubscriber->token,
        ),
    );

    /** @var Service $service */
    $service = Service::factory()->for($organization)->create();

    /** @var Subscriber $subscriber */
    $subscriber = Subscriber::factory()->for($organization)->create([
        'confirmed_at' => now(),
    ]);

    /** @var IncidentService $incidentService */
    $incidentService = app(IncidentService::class);

    $incident = $incidentService->createIncident(
        organization: $organization,
        title: 'API outage',
        status: IncidentStatus::Investigating,
        impact: IncidentImpact::Major,
        serviceIds: [$service->id],
        initialMessage: 'Investigating',
    );

    Mail::assertSent(IncidentCreatedMail::class, static fn (IncidentCreatedMail $mail): bool => $mail->hasTo($subscriber->email)
        && $mail->statusPageUrl === 'https://status.example.com/'
        && $mail->unsubscribeUrl === sprintf('https://status.example.com/unsubscribe/%s', $mail->subscriber->token));

    $incidentService->updateIncident($incident, IncidentStatus::Resolved);

    Mail::assertSent(IncidentResolvedMail::class, static fn (IncidentResolvedMail $mail): bool => $mail->hasTo($subscriber->email)
        && $mail->statusPageUrl === 'https://status.example.com/'
        && $mail->unsubscribeUrl === sprintf('https://status.example.com/unsubscribe/%s', $mail->subscriber->token));
});
