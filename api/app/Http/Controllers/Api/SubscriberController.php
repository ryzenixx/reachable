<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Subscribers\CreateSubscriberAction;
use App\Http\Controllers\Api\Concerns\ResolvesAuthenticatedContext;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSubscriberRequest;
use App\Http\Resources\SubscriberResource;
use App\Models\Subscriber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SubscriberController extends Controller
{
    use ResolvesAuthenticatedContext;

    public function __construct(private readonly CreateSubscriberAction $createSubscriberAction) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $rows = Subscriber::query()
            ->where('organization_id', $this->organizationId($request))
            ->latest('created_at')
            ->get();

        return SubscriberResource::collection($rows);
    }

    public function store(StoreSubscriberRequest $request): SubscriberResource
    {
        $subscriber = $this->createSubscriberAction->execute(
            organization: $this->organization($request),
            email: $request->validated('email'),
        );

        return new SubscriberResource($subscriber);
    }

    public function export(Request $request): StreamedResponse
    {
        $rows = Subscriber::query()
            ->where('organization_id', $this->organizationId($request))
            ->orderBy('email')
            ->cursor();

        return response()->streamDownload(function () use ($rows): void {
            $handle = fopen('php://output', 'w');

            if (! is_resource($handle)) {
                return;
            }

            fputcsv($handle, ['Email', 'Confirmed At', 'Created At']);

            foreach ($rows as $subscriber) {
                fputcsv($handle, [
                    $subscriber->email,
                    (string) $subscriber->confirmed_at,
                    (string) $subscriber->created_at,
                ]);
            }

            fclose($handle);
        }, 'subscribers.csv');
    }

    public function destroy(Subscriber $subscriber): JsonResponse
    {
        $this->authorize('delete', $subscriber);

        $subscriber->delete();

        return response()->json(status: 204);
    }
}
