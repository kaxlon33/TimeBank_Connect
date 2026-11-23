<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Members report a skill post or a review they think breaks the community rules.
     * An admin then keeps it (dismiss) or removes it (action). One report per member per item.
     */
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_id')->constrained('users')->cascadeOnDelete();
            $table->string('target_type', 16);                 // skill | review
            $table->unsignedBigInteger('target_id');
            $table->string('reason', 300);
            $table->string('status', 16)->default('open');     // open | dismissed | actioned
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->unique(['reporter_id', 'target_type', 'target_id']);   // no report spam
            $table->index(['status', 'target_type', 'target_id']);          // the admin queue
        });

        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE reports ADD CONSTRAINT reports_target_valid CHECK (target_type IN ('skill', 'review'))");
            DB::statement("ALTER TABLE reports ADD CONSTRAINT reports_status_valid CHECK (status IN ('open', 'dismissed', 'actioned'))");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
