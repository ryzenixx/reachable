<?php

declare(strict_types=1);

namespace App\Events;

use App\Http\Resources\ServiceResource;
use App\Models\Service;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ServiceStatusChanged implements ShouldBroadcast
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(public readonly Service $service)
    {
    }

    /**
     * @return array<int, Channel|PrivateChannel>
     */
    public function broadcastOn(): array
    {
        $organizationId = $this->service->organization_id;

        return [
            new Channel(sprintf('status.%s', $organizationId)),
            new PrivateChannel(sprintf('organizations.%s', $organizationId)),
        ];
    }

    public function broadcastAs(): string
    {
        return 'service.status.changed';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'service' => (new ServiceResource($this->service->loadMissing('uptimeMetrics')))->resolve(),
        ];
    }
}
