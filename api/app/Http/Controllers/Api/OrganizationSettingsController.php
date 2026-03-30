<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Organizations\UpdateOrganizationSettingsAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\DeleteOrganizationRequest;
use App\Http\Requests\UpdateOrganizationSettingsRequest;
use App\Http\Resources\OrganizationSettingsResource;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrganizationSettingsController extends Controller
{
    public function __construct(private readonly UpdateOrganizationSettingsAction $updateOrganizationSettingsAction)
    {
    }

    public function show(Request $request): OrganizationSettingsResource
    {
        /** @var User $user */
        $user = $request->user();

        return new OrganizationSettingsResource($user->organization);
    }

    public function update(UpdateOrganizationSettingsRequest $request, Organization $organization): OrganizationSettingsResource
    {
        $this->authorize('update', $organization);

        $updated = $this->updateOrganizationSettingsAction->execute($organization, $request->validated());

        return new OrganizationSettingsResource($updated);
    }

    public function destroy(DeleteOrganizationRequest $request, Organization $organization): JsonResponse
    {
        $this->authorize('delete', $organization);

        DB::transaction(static function () use ($organization): void {
            $organization->delete();
        });

        return response()->json(status: 204);
    }
}
