<?php

namespace App\Services;

use App\Models\PasswordResetChallenge;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PasswordResetService
{
    public function claimRequestSlot(string $email): bool
    {
        $key = 'password-reset:request:'.sha1(Str::lower($email));

        return Cache::add($key, true, (int) config('password_reset.resend_seconds'));
    }

    public function issue(string $email): string
    {
        $otp = (string) random_int(100000, 999999);

        PasswordResetChallenge::query()->updateOrCreate(
            ['email' => $email],
            [
                'otp_hash' => Hash::make($otp),
                'attempts' => 0,
                'expires_at' => now()->addMinutes((int) config('password_reset.otp_expire_minutes')),
                'verified_at' => null,
                'reset_token_hash' => null,
                'reset_expires_at' => null,
            ],
        );

        return $otp;
    }

    public function verify(string $email, string $otp): string
    {
        $resetToken = DB::transaction(function () use ($email, $otp): ?string {
            $challenge = PasswordResetChallenge::query()
                ->where('email', $email)
                ->lockForUpdate()
                ->first();

            $maxAttempts = (int) config('password_reset.max_attempts');

            if (! $challenge || $challenge->verified_at || $challenge->expires_at->isPast() || $challenge->attempts >= $maxAttempts || ! Hash::check($otp, $challenge->otp_hash)) {
                if ($challenge && $challenge->attempts < $maxAttempts) {
                    $challenge->increment('attempts');
                }

                return null;
            }

            $resetToken = bin2hex(random_bytes(32));
            $challenge->update([
                'verified_at' => now(),
                'reset_token_hash' => Hash::make($resetToken),
                'reset_expires_at' => now()->addMinutes((int) config('password_reset.reset_token_expire_minutes')),
            ]);

            return $resetToken;
        });

        if (! $resetToken) {
            throw ValidationException::withMessages([
                'otp' => ['Mã OTP không hợp lệ hoặc đã hết hạn.'],
            ]);
        }

        return $resetToken;
    }

    public function complete(string $email, string $resetToken, string $password): void
    {
        DB::transaction(function () use ($email, $password, $resetToken): void {
            $challenge = PasswordResetChallenge::query()
                ->where('email', $email)
                ->lockForUpdate()
                ->first();

            if (
                ! $challenge
                || ! $challenge->verified_at
                || ! $challenge->reset_expires_at
                || $challenge->reset_expires_at->isPast()
                || ! $challenge->reset_token_hash
                || ! Hash::check($resetToken, $challenge->reset_token_hash)
            ) {
                throw ValidationException::withMessages([
                    'reset_token' => ['Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'],
                ]);
            }

            $user = User::query()->where('email', $email)->firstOrFail();
            $user->update(['password' => $password]);
            $user->tokens()->delete();
            $challenge->delete();
        });
    }
}
