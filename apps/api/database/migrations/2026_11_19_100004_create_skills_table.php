<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('skills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('category_id')->constrained('skill_categories')->restrictOnDelete();
            $table->string('title', 120);
            $table->text('description');
            $table->string('status', 16)->default('active');    // App\Enums\SkillStatus
            $table->foreignId('removed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('removed_reason', 500)->nullable();
            $table->timestamp('removed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'category_id', 'created_at']); // live search filters
            // user_id ("my skills") is indexed by its foreign key.
        });

        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE skills ADD CONSTRAINT skills_status_valid CHECK (status IN ('active', 'hidden', 'removed'))");

            Schema::table('skills', function (Blueprint $table) {
                $table->fullText(['title', 'description']); // text search (design 4.5, optional use)
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('skills');
    }
};
