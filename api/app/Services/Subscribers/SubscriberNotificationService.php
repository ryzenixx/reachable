<?php

declare(strict_types=1);

namespace App\Services\Subscribers;

use App\Mail\IncidentCreatedMail;
use App\Mail\IncidentResolvedMail;
use App\Mail\SubscriptionConfirmationMail;
use App\Models\Incident;
use App\Models\Organization;
use App\Models\Subscriber;
use App\Services\Mail\OrganizationMailerFactory;
use Illuminate\Contracts\Mail\Mailable;
use Illuminate\Contracts\Mail\Mailer;

class SubscriberNotificationService
{
    public function __construct(private readonly OrganizationMailerFactory $organizationMailerFactory) {}

    public function sendSubscriptionConfirmation(Organization $organization, Subscriber $subscriber): void
    {
        $confirmUrl = sprintf(
            '%s/subscribe/confirm?token=%s',
            $organization->publicBaseUrl(),
            $subscriber->token,
        );
        $mailer = $this->organizationMailerFactory->make($organization);

        $this->sendMailable(
            mailer: $mailer,
            recipient: $subscriber->email,
            mailable: new SubscriptionConfirmationMail($organization, $confirmUrl),
        );
    }

    public function sendIncidentCreated(Incident $incident): void
    {
        $incident->loadMissing('organization', 'services');
        $mailer = $this->organizationMailerFactory->make($incident->organization);

        $incident->organization->subscribers()
            ->whereNotNull('confirmed_at')
            ->cursor()
            ->each(function (Subscriber $subscriber) use ($incident, $mailer): void {
                $this->sendMailable(
                    mailer: $mailer,
                    recipient: $subscriber->email,
                    mailable: new IncidentCreatedMail($incident, $subscriber),
                );
            });
    }

    public function sendIncidentResolved(Incident $incident): void
    {
        $incident->loadMissing('organization', 'services');
        $mailer = $this->organizationMailerFactory->make($incident->organization);

        $incident->organization->subscribers()
            ->whereNotNull('confirmed_at')
            ->cursor()
            ->each(function (Subscriber $subscriber) use ($incident, $mailer): void {
                $this->sendMailable(
                    mailer: $mailer,
                    recipient: $subscriber->email,
                    mailable: new IncidentResolvedMail($incident, $subscriber),
                );
            });
    }

    private function sendMailable(
        Mailer $mailer,
        string $recipient,
        Mailable $mailable,
    ): void {
        $mailable->to($recipient);
        $mailer->sendNow($mailable);
    }
}
