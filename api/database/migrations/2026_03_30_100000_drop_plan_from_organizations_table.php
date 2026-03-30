<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('organizations', 'plan')) {
            return;
        }

        Schema::table('organizations', function (Blueprint $table): void {
            $table->dropColumn('plan');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('organizations', 'plan')) {
            return;
        }

        Schema::table('organizations', function (Blueprint $table): void {
            $table->enum('plan', ['free', 'pro', 'business'])->default('free');
        });
    }
};

