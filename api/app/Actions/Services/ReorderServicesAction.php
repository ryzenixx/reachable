<?php

declare(strict_types=1);

namespace App\Actions\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class ReorderServicesAction
{
    /**
     * @param array<int, array{id: string, order: int}> $rows
     */
    public function execute(User $user, array $rows): void
    {
        DB::transaction(function () use ($user, $rows): void {
            foreach ($rows as $row) {
                DB::table('services')
                    ->where('id', $row['id'])
                    ->where('organization_id', $user->organization_id)
                    ->update(['order' => $row['order']]);
            }
        });
    }
}
