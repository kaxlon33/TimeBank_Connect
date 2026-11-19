<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Append-only credit ledger (design 4.3, ADR-0003). Rows are never updated or deleted.
     */
    public function up(): void
    {
        Schema::create('credit_transactions', function (Blueprint $table) {
            $table->id();
            $table->uuid('transfer_uuid');                // shared by the debit and credit rows of one transfer
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('counterparty_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('help_request_id')->nullable()->constrained('help_requests')->restrictOnDelete();
            $table->string('type', 32);                   // App\Enums\TransactionType
            $table->decimal('amount', 8, 2);              // signed: negative = debit, positive = credit
            $table->decimal('balance_after', 8, 2);       // owner's balance after this row
            $table->string('idempotency_key', 100)->unique(); // e.g. hr:42:debit, hr:42:credit, starter:17
            $table->string('note', 255)->nullable();
            $table->timestamp('created_at')->useCurrent(); // no updated_at: rows are immutable

            $table->index(['user_id', 'id']);             // paged history, newest first
            $table->index('transfer_uuid');
            // help_request_id and counterparty_id are indexed by their foreign keys.
        });

        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE credit_transactions ADD CONSTRAINT credit_tx_type_valid CHECK (type IN ('starter_grant', 'session_debit', 'session_credit', 'admin_adjustment'))");
            DB::statement('ALTER TABLE credit_transactions ADD CONSTRAINT credit_tx_amount_non_zero CHECK (amount <> 0)');
            DB::statement('ALTER TABLE credit_transactions ADD CONSTRAINT credit_tx_balance_after_non_negative CHECK (balance_after >= 0)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_transactions');
    }
};
