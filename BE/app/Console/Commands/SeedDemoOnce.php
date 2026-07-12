<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class SeedDemoOnce extends Command
{
    protected $signature = 'app:seed-demo-once';

    protected $description = 'Seed demo data only when the users table is empty';

    public function handle(): int
    {
        if (User::query()->exists()) {
            $this->info('Users already exist; demo seed skipped.');

            return self::SUCCESS;
        }

        $exitCode = Artisan::call('db:seed', ['--force' => true]);

        if ($exitCode !== self::SUCCESS) {
            $this->error('Demo data seed failed.');

            return $exitCode;
        }

        $this->info('Demo data seeded.');

        return self::SUCCESS;
    }
}
