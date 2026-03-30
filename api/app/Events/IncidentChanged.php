<?php

declare(strict_types=1);

namespace App\Events;

use App\Http\Resources\IncidentResource;
use App\Models\Incident;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class IncidentChanged implements ShouldBroadcast
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(public readonly Incident $incident) {}

    /**
     * @return array<int, Channel|PrivateChannel>
     */
    public function broadcastOn(): array
    {
        $organizationId = $this->incident->organization_id;

        return [
            new Channel(sprintf('status.%s', $organizationId)),
            new PrivateChannel(sprintf('organizations.%s', $organizationId)),
        ];
    }

    public function broadcastAs(): string
    {
        return 'incident.changed';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'incident' => (new IncidentResource($this->incident->loadMissing('services', 'updates')))->resolve(),
        ];
    }
}
