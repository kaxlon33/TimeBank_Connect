<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('areas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('country_id')->constrained('countries')->restrictOnDelete();
            $table->string('name', 120);
            $table->string('name_normalized', 120);     // lower-case, trimmed: the de-duplication key
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->unsignedBigInteger('osm_place_id')->nullable()->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['country_id', 'name_normalized']);
            $table->index(['latitude', 'longitude']);   // bounding-box "nearby" filter
            $table->index(['country_id', 'name']);      // autocomplete prefix search
        });

        // users.area_id was created in the users migration; add its FK now that areas exists
        // (areas.created_by references users, so one of the two FKs has to be added later).
        Schema::table('users', function (Blueprint $table) {
            $table->foreign('area_id')->references('id')->on('areas')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['area_id']);
        });

        Schema::dropIfExists('areas');
    }
};
