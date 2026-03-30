<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Incident;
use App\Models\Subscriber;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class IncidentResolvedMail extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    public readonly string $statusPageUrl;

    public readonly string $unsubscribeUrl;

    public function __construct(
        public readonly Incident $incident,
        public readonly Subscriber $subscriber,
    ) {
        $frontend = $this->incident->organization->publicBaseUrl();
        $this->statusPageUrl = sprintf('%s/', $frontend);
        $this->unsubscribeUrl = sprintf('%s/unsubscribe/%s', $frontend, $this->subscriber->token);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: sprintf('[%s] Incident resolved: %s', $this->incident->organization->name, $this->incident->title),
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.incident-resolved',
        );
    }

    /**
     * @return array<string, string>
     */
    public function attachments(): array
    {
        return [];
    }
}
