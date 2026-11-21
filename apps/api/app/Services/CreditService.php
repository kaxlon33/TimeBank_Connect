<?php

namespace App\Services;

use App\Enums\TransactionType;
use App\Models\AppSetting;
use App\Models\CreditTransaction;
use App\Models\HelpRequest;
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

    /**
     * Pay the helper for a confirmed session: the requester's balance goes down, the helper's goes
     * up, and two ledger rows (a debit and a credit) share one transfer id.
     *
     * Must be called inside a DB transaction that already holds the help request row lock.
     * Both member rows are locked here in ascending id order, so two opposite transfers can never
     * deadlock, and the payer's balance is read again after the lock.
     */
    public function transferForRequest(HelpRequest $request): void
    {
        $users = User::query()
            ->whereIn('id', [$request->requester_id, $request->provider_id])
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        $payer = $users[$request->requester_id];
        $payee = $users[$request->provider_id];
        $amount = round((float) $request->credits, 2);

        if ((float) $payer->credit_balance < $amount) {
            abort(422, 'You do not have enough credits to confirm this session.');
        }

        $payerBalance = round((float) $payer->credit_balance - $amount, 2);
        $payeeBalance = round((float) $payee->credit_balance + $amount, 2);
        $transfer = (string) Str::uuid();

        // The unique idempotency keys are the last line of defence against paying twice.
        CreditTransaction::query()->forceCreate([
            'transfer_uuid' => $transfer,
            'user_id' => $payer->id,
            'counterparty_id' => $payee->id,
            'help_request_id' => $request->id,
            'type' => TransactionType::SessionDebit->value,
            'amount' => -$amount,
            'balance_after' => $payerBalance,
            'idempotency_key' => "hr:{$request->id}:debit",
        ]);
        CreditTransaction::query()->forceCreate([
            'transfer_uuid' => $transfer,
            'user_id' => $payee->id,
            'counterparty_id' => $payer->id,
            'help_request_id' => $request->id,
            'type' => TransactionType::SessionCredit->value,
            'amount' => $amount,
            'balance_after' => $payeeBalance,
            'idempotency_key' => "hr:{$request->id}:credit",
        ]);

        $payer->forceFill(['credit_balance' => $payerBalance])->save();
        $payee->forceFill(['credit_balance' => $payeeBalance])->save();
    }
}
