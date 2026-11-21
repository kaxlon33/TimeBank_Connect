<?php

namespace App\Services;

use App\Enums\TransactionType;
use App\Models\AppSetting;
use App\Models\CreditTransaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * The only place credit balances change (ADR-0003). Every change is a row in the
 * append-only ledger plus the cached users.credit_balance, written in one locked
 * transaction. Idempotency keys make a repeated call a no-op.
 */
class CreditService
{
    /** Give a brand-new member the starter credit set by the admin. Safe to call twice. */
    public function grantStarter(User $user): ?CreditTransaction
    {
        $amount = round((float) AppSetting::getValue('starter_credit', 3), 2);
        if ($amount <= 0) {
            return null;
        }

        return DB::transaction(function () use ($user, $amount) {
            $locked = User::query()->whereKey($user->getKey())->lockForUpdate()->firstOrFail();
            $key = 'starter:'.$locked->id;

            $existing = CreditTransaction::query()->where('idempotency_key', $key)->first();
            if ($existing) {
                return $existing;
            }

            $balance = round((float) $locked->credit_balance + $amount, 2);

            $tx = CreditTransaction::query()->forceCreate([
                'transfer_uuid' => (string) Str::uuid(),
                'user_id' => $locked->id,
                'type' => TransactionType::StarterGrant->value,
                'amount' => $amount,
                'balance_after' => $balance,
                'idempotency_key' => $key,
                'note' => 'Welcome credit',
            ]);

            $locked->forceFill(['credit_balance' => $balance])->save();
            $user->forceFill(['credit_balance' => $balance])->syncOriginal();

            return $tx;
        });
    }
}
