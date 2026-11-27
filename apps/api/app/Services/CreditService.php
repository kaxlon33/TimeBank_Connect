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

    /**
     * Checks that the ledger is honest. It only reads, never edits.
     *   1. every member's cached balance equals the sum of their ledger rows, and
     *   2. every session transfer is exactly one debit and one credit that add up to zero.
     *
     * @return array{members: int, balance_mismatches: list<array{id:int, name:string, cached:float, ledger:float}>, unbalanced_transfers: list<array{transfer:string, sum:float, rows:int}>, ok: bool}
     */
    public function reconcile(): array
    {
        $sums = CreditTransaction::query()->select('user_id', DB::raw('SUM(amount) AS total'))->groupBy('user_id')->pluck('total', 'user_id');

        $mismatches = [];
        $members = 0;
        User::query()->orderBy('id')->each(function (User $user) use ($sums, &$mismatches, &$members) {
            $members++;
            $ledger = round((float) ($sums[$user->id] ?? 0), 2);
            $cached = round((float) $user->credit_balance, 2);
            if ($ledger !== $cached) {
                $mismatches[] = ['id' => $user->id, 'name' => $user->name, 'cached' => $cached, 'ledger' => $ledger];
            }
        });

        $unbalanced = CreditTransaction::query()
            ->whereIn('type', [TransactionType::SessionDebit->value, TransactionType::SessionCredit->value])
            ->select('transfer_uuid', DB::raw('SUM(amount) AS total'), DB::raw('COUNT(*) AS rows_in_transfer'))
            ->groupBy('transfer_uuid')
            ->havingRaw('ROUND(SUM(amount), 2) <> 0 OR COUNT(*) <> 2')
            ->get()
            ->map(fn ($t) => ['transfer' => $t->transfer_uuid, 'sum' => round((float) $t->total, 2), 'rows' => (int) $t->rows_in_transfer])
            ->all();

        return [
            'members' => $members,
            'balance_mismatches' => $mismatches,
            'unbalanced_transfers' => $unbalanced,
            'ok' => ! $mismatches && ! $unbalanced,
        ];
    }
}
