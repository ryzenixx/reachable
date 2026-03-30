<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('organizations', 'slug')) {
            return;
        }

        Schema::table('organizations', function (Blueprint $table): void {
            $table->dropColumn('slug');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('organizations', 'slug')) {
            return;
        }

        Schema::table('organizations', function (Blueprint $table): void {
            $table->string('slug')->unique()->after('name');
        });
    }
};
