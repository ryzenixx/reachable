<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Organization;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SubscriptionConfirmationMail extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public readonly Organization $organization,
        public readonly string $confirmUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: sprintf('Confirm your %s status updates subscription', $this->organization->name),
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.subscription-confirmation',
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
