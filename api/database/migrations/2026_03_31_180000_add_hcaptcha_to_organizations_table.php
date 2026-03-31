<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizations', static function (Blueprint $table): void {
            $table->string('hcaptcha_sitekey', 255)->nullable()->after('custom_domain');
            $table->string('hcaptcha_secret', 255)->nullable()->after('hcaptcha_sitekey');
        });
    }

    public function down(): void
    {
        Schema::table('organizations', static function (Blueprint $table): void {
            $table->dropColumn(['hcaptcha_sitekey', 'hcaptcha_secret']);
        });
    }
};
