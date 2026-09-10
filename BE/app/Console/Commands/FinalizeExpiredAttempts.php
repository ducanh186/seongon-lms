<?php

namespace App\Console\Commands;

use App\Services\AttemptLifecycleService;
use Illuminate\Console\Command;

class FinalizeExpiredAttempts extends Command
{
    protected $signature = 'attempts:finalize-expired';

    protected $description = 'Finalize quiz attempts whose server deadline has passed';

    public function handle(AttemptLifecycleService $attempts): int
    {
        $this->info("Finalized {$attempts->finalizeExpired()} expired attempts.");

        return self::SUCCESS;
    }
}
