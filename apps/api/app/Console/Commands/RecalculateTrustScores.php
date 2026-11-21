<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\TrustScoreService;
use Illuminate\Console\Command;

class RecalculateTrustScores extends Command
{
    protected $signature = 'trust:recalculate';

    protected $description = 'Recalculate every member\'s cached trust score from their sessions and reviews';

    public function handle(TrustScoreService $trust): int
    {
        $count = 0;
        User::query()->orderBy('id')->each(function (User $user) use ($trust, &$count) {
            $trust->recalculate($user);
            $count++;
        });

        $this->info("Recalculated {$count} trust scores.");

        return self::SUCCESS;
    }
}
