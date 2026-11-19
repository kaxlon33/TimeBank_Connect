<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('badges', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();   // e.g. first_exchange; thresholds live in config/timebank.php
            $table->string('name', 80);
            $table->string('description', 255);
            $table->string('icon', 50)->nullable();
            $table->timestamps();
        });

        Schema::create('user_badges', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('badge_id')->constrained('badges')->restrictOnDelete();
            $table->timestamp('awarded_at')->useCurrent();

            $table->primary(['user_id', 'badge_id']); // makes awarding idempotent
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_badges');
        Schema::dropIfExists('badges');
    }
};
