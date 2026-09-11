<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** @var array<int, array{0:string,1:string,2:string,3:string}> */
    private array $foreignKeys = [
        ['orders', 'user_id', 'users', 'id'],
        ['orders', 'course_id', 'courses', 'id'],
        ['enrollments', 'user_id', 'users', 'id'],
        ['enrollments', 'course_id', 'courses', 'id'],
        ['lesson_progress', 'enrollment_id', 'enrollments', 'id'],
        ['lesson_progress', 'lesson_id', 'lessons', 'id'],
        ['learning_progress', 'enrollment_id', 'enrollments', 'id'],
        ['learning_progress', 'lesson_id', 'lessons', 'id'],
        ['attempts', 'enrollment_id', 'enrollments', 'id'],
        ['attempts', 'exam_id', 'exams', 'id'],
        ['certificates', 'enrollment_id', 'enrollments', 'id'],
        ['reviews', 'user_id', 'users', 'id'],
        ['reviews', 'course_id', 'courses', 'id'],
        ['user_records', 'user_id', 'users', 'id'],
    ];

    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            $this->replaceMySqlForeignKeys('restrict');

            return;
        }

        $this->createSqliteGuards();
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            $this->replaceMySqlForeignKeys('cascade');

            return;
        }

        foreach ($this->sqliteTriggerNames() as $trigger) {
            DB::statement("DROP TRIGGER IF EXISTS {$trigger}");
        }
    }

    private function replaceMySqlForeignKeys(string $onDelete): void
    {
        foreach ($this->foreignKeys as [$table, $column, $parent, $parentColumn]) {
            $constraints = DB::select(
                'select CONSTRAINT_NAME as fk_name from information_schema.key_column_usage where table_schema = database() and table_name = ? and column_name = ? and referenced_table_name is not null',
                [$table, $column],
            );
            foreach ($constraints as $constraint) {
                $name = str_replace('`', '', $constraint->fk_name);
                DB::statement("alter table `{$table}` drop foreign key `{$name}`");
            }
            $name = "{$table}_{$column}_historical_fk";
            DB::statement("alter table `{$table}` add constraint `{$name}` foreign key (`{$column}`) references `{$parent}` (`{$parentColumn}`) on delete {$onDelete}");
        }
    }

    private function createSqliteGuards(): void
    {
        DB::statement("CREATE TRIGGER IF NOT EXISTS guard_courses_history BEFORE DELETE ON courses BEGIN SELECT CASE WHEN EXISTS (SELECT 1 FROM enrollments WHERE course_id = OLD.id) OR EXISTS (SELECT 1 FROM orders WHERE course_id = OLD.id) OR EXISTS (SELECT 1 FROM reviews WHERE course_id = OLD.id) OR EXISTS (SELECT 1 FROM exams e JOIN attempts a ON a.exam_id = e.id WHERE e.course_id = OLD.id) THEN RAISE(ABORT, 'course has historical dependencies') END; END");
        DB::statement("CREATE TRIGGER IF NOT EXISTS guard_lessons_history BEFORE DELETE ON lessons BEGIN SELECT CASE WHEN EXISTS (SELECT 1 FROM lesson_progress WHERE lesson_id = OLD.id) OR EXISTS (SELECT 1 FROM learning_progress WHERE lesson_id = OLD.id) THEN RAISE(ABORT, 'lesson has historical dependencies') END; END");
        DB::statement("CREATE TRIGGER IF NOT EXISTS guard_exams_history BEFORE DELETE ON exams BEGIN SELECT CASE WHEN EXISTS (SELECT 1 FROM attempts WHERE exam_id = OLD.id) THEN RAISE(ABORT, 'exam has historical dependencies') END; END");
        DB::statement("CREATE TRIGGER IF NOT EXISTS guard_enrollments_history BEFORE DELETE ON enrollments BEGIN SELECT CASE WHEN EXISTS (SELECT 1 FROM lesson_progress WHERE enrollment_id = OLD.id) OR EXISTS (SELECT 1 FROM learning_progress WHERE enrollment_id = OLD.id) OR EXISTS (SELECT 1 FROM attempts WHERE enrollment_id = OLD.id) OR EXISTS (SELECT 1 FROM certificates WHERE enrollment_id = OLD.id) THEN RAISE(ABORT, 'enrollment has historical dependencies') END; END");
        DB::statement("CREATE TRIGGER IF NOT EXISTS guard_users_history BEFORE DELETE ON users BEGIN SELECT CASE WHEN EXISTS (SELECT 1 FROM enrollments WHERE user_id = OLD.id) OR EXISTS (SELECT 1 FROM orders WHERE user_id = OLD.id) OR EXISTS (SELECT 1 FROM reviews WHERE user_id = OLD.id) OR EXISTS (SELECT 1 FROM user_records WHERE user_id = OLD.id) THEN RAISE(ABORT, 'user has historical dependencies') END; END");
        DB::statement("CREATE TRIGGER IF NOT EXISTS guard_questions_history BEFORE DELETE ON questions BEGIN SELECT CASE WHEN EXISTS (SELECT 1 FROM attempts a, json_each(a.answers) j WHERE a.answers IS NOT NULL AND CAST(json_extract(j.value, '$.question_id') AS INTEGER) = OLD.id) THEN RAISE(ABORT, 'question has historical dependencies') END; END");
    }

    /** @return array<int, string> */
    private function sqliteTriggerNames(): array
    {
        return [
            'guard_courses_history',
            'guard_lessons_history',
            'guard_exams_history',
            'guard_enrollments_history',
            'guard_users_history',
            'guard_questions_history',
        ];
    }
};
