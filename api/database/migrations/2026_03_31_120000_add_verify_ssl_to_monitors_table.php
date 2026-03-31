<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('monitors', static function (Blueprint $table): void {
            $table->boolean('verify_ssl')->default(true)->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('monitors', static function (Blueprint $table): void {
            $table->dropColumn('verify_ssl');
        });
    }
};
