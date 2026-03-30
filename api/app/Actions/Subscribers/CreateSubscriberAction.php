<?php

declare(strict_types=1);

namespace App\Actions\Subscribers;

use App\Models\Organization;
use App\Models\Subscriber;
use App\Services\Subscribers\SubscriberNotificationService;
use Illuminate\Support\Str;

class CreateSubscriberAction
{
    public function __construct(private readonly SubscriberNotificationService $notificationService) {}

    public function execute(Organization $organization, string $email): Subscriber
    {
        /** @var Subscriber $subscriber */
        $subscriber = Subscriber::query()->firstOrCreate(
            [
                'organization_id' => $organization->id,
                'email' => strtolower($email),
            ],
            [
                'token' => Str::random(48),
            ],
        );

        if ($subscriber->confirmed_at === null) {
            $this->notificationService->sendSubscriptionConfirmation($organization, $subscriber);
        }

        return $subscriber;
    }
}
