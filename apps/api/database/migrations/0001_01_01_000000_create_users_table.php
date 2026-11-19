<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');

            // TimeBank Connect columns (design 4.1)
            $table->string('role', 16)->default('member');       // App\Enums\UserRole
            $table->string('status', 16)->default('active');     // App\Enums\UserStatus
            $table->string('suspended_reason', 500)->nullable();
            $table->timestamp('suspended_at')->nullable();
            $table->text('bio')->nullable();
            $table->string('avatar_path')->nullable();
            // FK to areas is added in the create_areas_table migration (areas.created_by references users).
            $table->unsignedBigInteger('area_id')->nullable()->index();
            // Cached copy of SUM(credit_transactions.amount). Only CreditService may change it (ADR-0003).
            $table->decimal('credit_balance', 8, 2)->default(0);
            // Cached trust score 0-100 (design 10.2). 61.25 = neutral prior for a brand-new member.
            $table->decimal('trust_score', 5, 2)->default(61.25);

            $table->rememberToken();
            $table->timestamps();

            $table->index(['status', 'role']);
        });

        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement('ALTER TABLE users ADD CONSTRAINT users_credit_balance_non_negative CHECK (credit_balance >= 0)');
            DB::statement('ALTER TABLE users ADD CONSTRAINT users_trust_score_range CHECK (trust_score BETWEEN 0 AND 100)');
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_valid CHECK (role IN ('member', 'admin'))");
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_status_valid CHECK (status IN ('active', 'suspended'))");
        }

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
