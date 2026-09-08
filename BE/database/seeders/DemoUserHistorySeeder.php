<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoUserHistorySeeder extends Seeder
{
    public function run(): void
    {
        // Only known generated demo accounts, never real users or the admin.
        foreach (['student001@demo.seongon.vn', 'student002@demo.seongon.vn'] as $email) {
            DB::transaction(function () use ($email): void {
                $user = User::query()->where('email', $email)->where('role', 'student')->lockForUpdate()->first();
                if (! $user || $user->statusRecords()->exists()) {
                    return;
                }

                // An even number of transitions ends at the unchanged runtime status.
                $status = $user->status;
                $end = now()->startOfSecond();
                $start = $end->copy()->subMinutes(4)->max($user->created_at)->min($end);
                $interval = $start->diffInSeconds($end) / 4;
                foreach (range(0, 3) as $index) {
                    $next = $status === 'active' ? 'locked' : 'active';
                    $record = $user->statusRecords()->make([
                        'old_status' => $status,
                        'new_status' => $next,
                        'reason' => $next === 'locked'
                            ? '[Demo] Tạm khóa tài khoản để kiểm tra yêu cầu hỗ trợ.'
                            : '[Demo] Đã xác minh thông tin, mở lại quyền truy cập.',
                    ]);
                    // Fresh accounts may share a timestamp; the API also orders by id.
                    $record->created_at = $start->copy()->addSeconds((int) ($interval * $index));
                    $record->save();
                    $status = $next;
                }
            });
        }
    }
}
