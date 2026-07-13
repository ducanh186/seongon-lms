<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        User::factory()->admin()->create([
            'name' => 'SEONGON Admin',
            'email' => 'admin@seongon.vn',
        ]);

        User::factory()->create([
            'name' => 'Học viên Demo',
            'email' => 'student@seongon.vn',
        ]);

        foreach (range(1, 15) as $number) {
            User::factory()->create([
                'name' => sprintf('Học viên SEONGON %02d', $number),
                'email' => sprintf('learner%02d@seongon.vn', $number),
            ]);
        }

        $this->call(GeneratedDemoCatalogSeeder::class);
    }
}
