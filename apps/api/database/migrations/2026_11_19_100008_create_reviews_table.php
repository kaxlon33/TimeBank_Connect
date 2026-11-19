<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('help_request_id')->constrained('help_requests')->restrictOnDelete();
            $table->foreignId('reviewer_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('reviewee_id')->constrained('users')->restrictOnDelete();
            $table->unsignedTinyInteger('rating');        // 1 to 5
            $table->text('comment')->nullable();
            $table->string('status', 16)->default('visible'); // App\Enums\ReviewStatus
            $table->foreignId('removed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('removed_reason', 500)->nullable();
            $table->timestamp('removed_at')->nullable();
            $table->timestamps();

            $table->unique(['help_request_id', 'reviewer_id']);     // one review per side
            $table->index(['reviewee_id', 'status', 'created_at']); // profile review list
        });

        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement('ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5)');
            DB::statement("ALTER TABLE reviews ADD CONSTRAINT reviews_status_valid CHECK (status IN ('visible', 'removed'))");
            DB::statement('ALTER TABLE reviews ADD CONSTRAINT reviews_not_self CHECK (reviewer_id <> reviewee_id)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
