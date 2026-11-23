<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('skills', function (Blueprint $table) {
            // Path on the public disk of a picture the member uploaded; null = the app picks a picture.
            $table->string('image_path')->nullable()->after('description');
        });

        Schema::table('users', function (Blueprint $table) {
            // Last time the member used the app (updated at most every few minutes). 30 days quiet = inactive.
            $table->timestamp('last_active_at')->nullable()->after('trust_score')->index();
        });
    }

    public function down(): void
    {
        Schema::table('skills', fn (Blueprint $table) => $table->dropColumn('image_path'));
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['last_active_at']);
            $table->dropColumn('last_active_at');
        });
    }
};
