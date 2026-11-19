<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('availability_slots', function (Blueprint $table) {
            $table->id();
            // Profile data, not history: removed together with the user.
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('weekday');   // 0 = Sunday ... 6 = Saturday (Carbon dayOfWeek)
            $table->time('start_time');
            $table->time('end_time');
            $table->timestamps();

            // Prevents duplicate slots and also serves the (user_id, weekday) matching lookup.
            $table->unique(['user_id', 'weekday', 'start_time']);
        });

        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement('ALTER TABLE availability_slots ADD CONSTRAINT availability_weekday_range CHECK (weekday BETWEEN 0 AND 6)');
            DB::statement('ALTER TABLE availability_slots ADD CONSTRAINT availability_time_order CHECK (end_time > start_time)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('availability_slots');
    }
};
