<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** An admin can switch a country off: it disappears from the sign-up list but keeps its members. */
    public function up(): void
    {
        Schema::table('countries', function (Blueprint $table) {
            $table->boolean('is_active')->default(true)->after('calling_code');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('countries', function (Blueprint $table) {
            $table->dropIndex(['is_active']);
            $table->dropColumn('is_active');
        });
    }
};
