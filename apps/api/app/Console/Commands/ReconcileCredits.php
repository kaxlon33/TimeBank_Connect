<?php

namespace App\Console\Commands;

use App\Services\CreditService;
use Illuminate\Console\Command;

/**
 * Proves the credit ledger is honest (design 4.3): every balance equals the sum of its ledger rows and
 * every session transfer nets to zero. It only reports; it never edits balances or ledger rows.
 * Exit code 1 means something drifted.
 */
class ReconcileCredits extends Command
{
    protected $signature = 'credits:reconcile';

    protected $description = 'Check that every credit balance matches the ledger and every transfer nets to zero';

    public function handle(CreditService $credits): int
    {
        $result = $credits->reconcile();

        $this->info("Checked {$result['members']} members.");

        if ($result['balance_mismatches']) {
            $this->error('Balances that do not match the ledger:');
            $this->table(
                ['ID', 'Member', 'Cached balance', 'Ledger sum', 'Difference'],
                array_map(fn ($m) => [$m['id'], $m['name'], number_format($m['cached'], 2), number_format($m['ledger'], 2), number_format($m['cached'] - $m['ledger'], 2)], $result['balance_mismatches']),
            );
        }

        if ($result['unbalanced_transfers']) {
            $this->error('Transfers that do not net to zero:');
            $this->table(['Transfer', 'Sum', 'Rows'], array_map(fn ($t) => [$t['transfer'], $t['sum'], $t['rows']], $result['unbalanced_transfers']));
        }

        if ($result['ok']) {
            $this->info('All balances match the ledger and every transfer nets to zero.');

            return self::SUCCESS;
        }

        return self::FAILURE;
    }
}
