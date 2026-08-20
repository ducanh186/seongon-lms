<?php

namespace Database\Seeders;

use App\Models\User;
use App\Support\DemoStudentNames;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RoleSeeder::class);

        User::factory()->admin()->create([
            'name' => 'SEONGON Admin',
            'email' => 'admin@seongon.vn',
        ]);

        User::factory()->create([
            'name' => DemoStudentNames::forNumber(1),
            'email' => 'student@seongon.vn',
        ]);

        foreach (range(1, 15) as $number) {
            User::factory()->create([
                'name' => DemoStudentNames::forNumber($number + 1),
                'email' => sprintf('learner%02d@seongon.vn', $number),
            ]);
        }

        $this->call(GeneratedDemoCatalogSeeder::class);
        $this->call(CompletedCourseDemoSeeder::class);
        $this->call(DemoNewsSeeder::class);
    }
}
