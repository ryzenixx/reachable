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
        Schema::create('services', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('group')->nullable();
            $table->enum('status', ['operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance'])->default('operational');
            $table->unsignedInteger('order')->default(0);
            $table->boolean('is_public')->default(true);
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'order']);
            $table->index('group');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
