<?php

namespace App\Console\Commands;

use Database\Seeders\GeneratedDemoCatalogSeeder;
use Illuminate\Console\Command;

class ReplaceDemoCatalog extends Command
{
    protected $signature = 'app:replace-demo-catalog
        {--force : Xác nhận xóa catalog và dữ liệu học tập cũ}';

    protected $description = 'Replace the current catalog with deterministic demo learning data';

    public function handle(GeneratedDemoCatalogSeeder $seeder): int
    {
        if (! $this->option('force')) {
            $this->error('Catalog chưa được thay đổi. Hãy chạy lại với --force.');

            return self::FAILURE;
        }

        $seeder->run();
        $this->info('Đã thay catalog demo thành công.');

        return self::SUCCESS;
    }
}
