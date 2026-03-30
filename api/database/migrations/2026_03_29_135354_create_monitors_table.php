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
        Schema::create('monitors', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('service_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['http', 'tcp', 'ping']);
            $table->string('url');
            $table->enum('method', ['GET', 'POST', 'HEAD'])->default('GET');
            $table->unsignedInteger('interval_seconds')->default(60);
            $table->unsignedInteger('timeout_ms')->default(5000);
            $table->unsignedSmallInteger('expected_status_code')->default(200);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['service_id', 'is_active']);
            $table->index('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('monitors');
    }
};
