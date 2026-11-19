<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('help_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('requester_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('provider_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('skill_id')->constrained('skills')->restrictOnDelete();
            $table->text('message')->nullable();
            $table->decimal('hours', 4, 2);             // 0.5 to 4 in 0.5 steps (validated in the Form Request)
            $table->decimal('credits', 8, 2);           // snapshot: hours x credits_per_hour at creation
            $table->dateTime('proposed_at')->nullable();
            $table->string('status', 24)->default('pending'); // App\Enums\RequestStatus
            $table->timestamp('responded_at')->nullable();     // accepted or declined
            $table->timestamp('provider_done_at')->nullable(); // provider marked "session done"
            $table->timestamp('completed_at')->nullable();     // requester confirmed; credits moved
            $table->timestamp('cancelled_at')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('cancel_reason', 500)->nullable();
            $table->timestamps();

            $table->index(['provider_id', 'status', 'created_at']);  // inbox
            $table->index(['requester_id', 'status', 'created_at']); // outbox
            // skill_id is indexed by its foreign key.
        });

        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE help_requests ADD CONSTRAINT help_requests_status_valid CHECK (status IN ('pending', 'accepted', 'awaiting_confirmation', 'declined', 'cancelled', 'completed'))");
            DB::statement('ALTER TABLE help_requests ADD CONSTRAINT help_requests_hours_positive CHECK (hours > 0)');
            DB::statement('ALTER TABLE help_requests ADD CONSTRAINT help_requests_credits_non_negative CHECK (credits >= 0)');
            DB::statement('ALTER TABLE help_requests ADD CONSTRAINT help_requests_not_self CHECK (requester_id <> provider_id)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('help_requests');
    }
};
