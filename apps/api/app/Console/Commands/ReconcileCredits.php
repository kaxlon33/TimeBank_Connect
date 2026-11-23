<?php

namespace App\Console\Commands;

use App\Models\CreditTransaction;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Proves the credit ledger is honest (design 4.3). It checks that
 *   1. every member's cached balance equals the sum of their ledger rows, and
 *   2. every session transfer's debit and credit add up to zero (credits are moved, never created).
 * It only reports. It never edits balances or ledger rows. Exit code 1 means something drifted.
 */
class ReconcileCredits extends Command
{
    protected $signature = 'credits:reconcile';

    protected $description = 'Check that every credit balance matches the ledger and every transfer nets to zero';

    public function handle(): int
    {
        $sums = CreditTransaction::query()->select('user_id', DB::raw('SUM(amount) AS total'))->groupBy('user_id')->pluck('total', 'user_id');

        $problems = [];
        $checked = 0;

        User::query()->orderBy('id')->each(function (User $user) use ($sums, &$problems, &$checked) {
            $checked++;
            $ledger = round((float) ($sums[$user->id] ?? 0), 2);
            $cached = round((float) $user->credit_balance, 2);

            if ($ledger !== $cached) {
                $problems[] = [$user->id, $user->name, number_format($cached, 2), number_format($ledger, 2), number_format($cached - $ledger, 2)];
            }
        });

        $unbalanced = CreditTransaction::query()
            ->whereIn('type', ['session_debit', 'session_credit'])
            ->select('transfer_uuid', DB::raw('SUM(amount) AS total'), DB::raw('COUNT(*) AS rows_in_transfer'))
            ->groupBy('transfer_uuid')
            ->havingRaw('ROUND(SUM(amount), 2) <> 0 OR COUNT(*) <> 2')
            ->get();

        $this->info("Checked {$checked} members.");

        if ($problems) {
            $this->error('Balances that do not match the ledger:');
            $this->table(['ID', 'Member', 'Cached balance', 'Ledger sum', 'Difference'], $problems);
        }

        if ($unbalanced->isNotEmpty()) {
            $this->error('Transfers that do not net to zero:');
            $this->table(['Transfer', 'Sum', 'Rows'], $unbalanced->map(fn ($t) => [$t->transfer_uuid, $t->total, $t->rows_in_transfer])->all());
        }

        if (! $problems && $unbalanced->isEmpty()) {
            $this->info('All balances match the ledger and every transfer nets to zero.');

            return self::SUCCESS;
        }

        return self::FAILURE;
    }
}
