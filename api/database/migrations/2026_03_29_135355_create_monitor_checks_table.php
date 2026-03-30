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
        Schema::create('monitor_checks', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('monitor_id')->constrained()->cascadeOnDelete();
            $table->enum('status', ['up', 'down', 'degraded']);
            $table->unsignedInteger('response_time_ms');
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->string('error_message')->nullable();
            $table->timestamp('checked_at')->index();

            $table->index(['monitor_id', 'checked_at']);
            $table->index(['monitor_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('monitor_checks');
    }
};
