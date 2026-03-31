<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\Subscribers\CreateSubscriberAction;
use App\Http\Requests\StoreSubscriberRequest;
use App\Http\Resources\IncidentResource;
use App\Http\Resources\MaintenanceResource;
use App\Http\Resources\OrganizationResource;
use App\Http\Resources\ServiceResource;
use App\Models\Incident;
use App\Models\Organization;
use App\Models\Subscriber;
use App\Services\Status\PublicStatusPageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class PublicStatusController extends Controller
{
    public function __construct(
        private readonly PublicStatusPageService $publicStatusPageService,
        private readonly CreateSubscriberAction $createSubscriberAction,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $organization = $this->resolveOrganization();

        $page = max(1, (int) $request->query('page', 1));
        $payload = $this->publicStatusPageService->build($organization, $page);

        return response()->json([
            'organization' => new OrganizationResource($payload['organization']),
            'global_status' => $payload['global_status'],
            'services' => ServiceResource::collection($payload['services']),
            'active_incidents' => IncidentResource::collection($payload['active_incidents']),
            'maintenances' => MaintenanceResource::collection($payload['maintenances']),
            'incident_history' => [
                'data' => IncidentResource::collection($payload['incident_history']->items()),
                'meta' => [
                    'current_page' => $payload['incident_history']->currentPage(),
                    'last_page' => $payload['incident_history']->lastPage(),
                    'total' => $payload['incident_history']->total(),
                ],
            ],
        ]);
    }

    public function incident(string $incidentId): JsonResponse
    {
        $organization = $this->resolveOrganization();

        /** @var Incident|null $incident */
        $incident = Incident::query()
            ->where('id', $incidentId)
            ->where('organization_id', $organization->id)
            ->with([
                'services',
                'updates' => static function ($query): void {
                    $query->orderBy('created_at');
                },
            ])
            ->first();

        abort_if(! $incident instanceof Incident, 404, 'Incident not found.');

        return response()->json([
            'organization' => new OrganizationResource($organization),
            'incident' => new IncidentResource($incident),
        ]);
    }

    public function subscribe(StoreSubscriberRequest $request): JsonResponse
    {
        $organization = $this->resolveOrganization();

        if (! (bool) $organization->smtp_enabled) {
            return response()->json([
                'message' => 'Email updates are not enabled for this status page.',
            ], 409);
        }

        if ($this->organizationRequiresCaptcha($organization)) {
            $captchaToken = $request->input('captcha_token', '');

            if (! $this->verifyCaptcha($organization->hcaptcha_secret, $captchaToken)) {
                return response()->json([
                    'message' => 'Captcha verification failed.',
                ], 422);
            }
        }

        $subscriber = $this->createSubscriberAction->execute(
            organization: $organization,
            email: $request->validated('email'),
        );

        return response()->json([
            'message' => 'Subscription pending confirmation. Check your inbox.',
            'subscriber_id' => $subscriber->id,
        ]);
    }

    public function confirm(string $token): JsonResponse
    {
        $organization = $this->resolveOrganization();

        /** @var Subscriber|null $subscriber */
        $subscriber = Subscriber::query()
            ->where('organization_id', $organization->id)
            ->where('token', $token)
            ->first();

        abort_if(! $subscriber instanceof Subscriber, 404, 'This confirmation link is invalid or already used.');
        abort_if($subscriber->confirmed_at !== null, 410, 'This confirmation link is invalid or already used.');

        $subscriber->confirmed_at = now();
        $subscriber->save();

        return response()->json(['message' => 'Subscription confirmed.']);
    }

    public function unsubscribe(string $token): JsonResponse
    {
        $organization = $this->resolveOrganization();

        /** @var Subscriber|null $subscriber */
        $subscriber = Subscriber::query()
            ->where('organization_id', $organization->id)
            ->where('token', $token)
            ->first();

        abort_if(! $subscriber instanceof Subscriber, 404, 'This unsubscribe link is invalid or already used.');

        $subscriber->delete();

        return response()->json(['message' => 'You have been unsubscribed.']);
    }

    private function organizationRequiresCaptcha(Organization $organization): bool
    {
        return is_string($organization->hcaptcha_sitekey)
            && mb_strlen($organization->hcaptcha_sitekey) > 0
            && is_string($organization->hcaptcha_secret)
            && mb_strlen($organization->hcaptcha_secret) > 0;
    }

    private function verifyCaptcha(string $secret, mixed $token): bool
    {
        if (! is_string($token) || $token === '') {
            return false;
        }

        try {
            $response = Http::asForm()->post('https://api.hcaptcha.com/siteverify', [
                'secret' => $secret,
                'response' => $token,
            ]);

            return $response->ok() && $response->json('success') === true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function resolveOrganization(): Organization
    {
        /** @var Organization|null $organization */
        $organization = Organization::query()
            ->orderBy('created_at')
            ->orderBy('id')
            ->first();

        abort_if(! $organization instanceof Organization, 404, 'Organization not found.');

        return $organization;
    }
}
