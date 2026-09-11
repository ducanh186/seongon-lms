<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Notifications\PasswordResetOtpNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_user_can_request_a_six_digit_password_reset_otp(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $response = $this->postJson('/api/v1/auth/password-reset/request', [
            'email' => $user->email,
        ]);

        $response->assertAccepted()->assertExactJson([
            'message' => 'Nếu email tồn tại, OTP đã được gửi.',
            'retry_after_seconds' => 60,
        ]);

        Notification::assertSentTo(
            $user,
            PasswordResetOtpNotification::class,
            fn (PasswordResetOtpNotification $notification): bool => preg_match('/^\d{6}$/', $notification->otp) === 1,
        );
    }

    public function test_user_can_verify_the_emailed_otp_and_receive_a_one_time_reset_token(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/password-reset/request', [
            'email' => $user->email,
        ])->assertAccepted();

        /** @var PasswordResetOtpNotification $notification */
        $notification = Notification::sent($user, PasswordResetOtpNotification::class)->sole();

        $response = $this->postJson('/api/v1/auth/password-reset/verify', [
            'email' => $user->email,
            'otp' => $notification->otp,
        ]);

        $response->assertOk()->assertJsonStructure(['reset_token']);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $response->json('reset_token'));
    }

    public function test_verified_user_can_reset_the_password_and_existing_sessions_are_revoked(): void
    {
        Notification::fake();
        $user = User::factory()->create(['password' => 'OldPass123!']);
        $oldToken = $user->createToken('existing-session')->plainTextToken;

        $this->postJson('/api/v1/auth/password-reset/request', [
            'email' => $user->email,
        ])->assertAccepted();

        /** @var PasswordResetOtpNotification $notification */
        $notification = Notification::sent($user, PasswordResetOtpNotification::class)->sole();
        $resetToken = $this->postJson('/api/v1/auth/password-reset/verify', [
            'email' => $user->email,
            'otp' => $notification->otp,
        ])->assertOk()->json('reset_token');

        $this->postJson('/api/v1/auth/password-reset/complete', [
            'email' => $user->email,
            'reset_token' => $resetToken,
            'password' => 'NewPass123!',
            'password_confirmation' => 'NewPass123!',
        ])->assertOk()->assertExactJson([
            'message' => 'Mật khẩu đã được đặt lại. Vui lòng đăng nhập lại.',
        ]);

        $this->withToken($oldToken)->getJson('/api/v1/auth/me')->assertUnauthorized();
        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'OldPass123!',
        ])->assertUnprocessable();
        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'NewPass123!',
        ])->assertOk();
    }

    public function test_password_reset_otp_cannot_be_requested_again_within_sixty_seconds(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/password-reset/request', [
            'email' => $user->email,
        ])->assertAccepted();

        $this->postJson('/api/v1/auth/password-reset/request', [
            'email' => $user->email,
        ])->assertTooManyRequests()->assertExactJson([
            'message' => 'Vui lòng chờ 60 giây trước khi yêu cầu OTP mới.',
            'retry_after_seconds' => 60,
        ]);

        Notification::assertSentToTimes($user, PasswordResetOtpNotification::class, 1);
    }

    public function test_password_reset_otp_can_only_be_verified_once(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/password-reset/request', [
            'email' => $user->email,
        ])->assertAccepted();

        /** @var PasswordResetOtpNotification $notification */
        $notification = Notification::sent($user, PasswordResetOtpNotification::class)->sole();
        $payload = ['email' => $user->email, 'otp' => $notification->otp];

        $this->postJson('/api/v1/auth/password-reset/verify', $payload)->assertOk();
        $this->postJson('/api/v1/auth/password-reset/verify', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('otp');
    }

    public function test_reset_token_has_its_own_ten_minute_lifetime_after_otp_verification(): void
    {
        Notification::fake();
        $this->travelTo(Carbon::parse('2026-09-11 12:00:00'));
        $user = User::factory()->create(['password' => 'OldPass123!']);

        $this->postJson('/api/v1/auth/password-reset/request', [
            'email' => $user->email,
        ])->assertAccepted();

        /** @var PasswordResetOtpNotification $notification */
        $notification = Notification::sent($user, PasswordResetOtpNotification::class)->sole();
        $this->travel(9)->minutes();
        $this->travel(59)->seconds();

        $resetToken = $this->postJson('/api/v1/auth/password-reset/verify', [
            'email' => $user->email,
            'otp' => $notification->otp,
        ])->assertOk()->json('reset_token');

        $this->travel(2)->seconds();
        $this->postJson('/api/v1/auth/password-reset/complete', [
            'email' => $user->email,
            'reset_token' => $resetToken,
            'password' => 'NewPass123!',
            'password_confirmation' => 'NewPass123!',
        ])->assertOk();
    }

    public function test_password_reset_request_does_not_reveal_an_unknown_email(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/auth/password-reset/request', [
            'email' => 'missing@example.test',
        ])->assertAccepted()->assertExactJson([
            'message' => 'Nếu email tồn tại, OTP đã được gửi.',
            'retry_after_seconds' => 60,
        ]);

        Notification::assertNothingSent();
    }

    public function test_otp_expires_after_ten_minutes(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/password-reset/request', [
            'email' => $user->email,
        ])->assertAccepted();

        /** @var PasswordResetOtpNotification $notification */
        $notification = Notification::sent($user, PasswordResetOtpNotification::class)->sole();
        $this->travel(10)->minutes();
        $this->travel(1)->second();

        $this->postJson('/api/v1/auth/password-reset/verify', [
            'email' => $user->email,
            'otp' => $notification->otp,
        ])->assertUnprocessable()->assertJsonValidationErrors('otp');
    }

    public function test_otp_is_locked_after_five_failed_attempts(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/password-reset/request', [
            'email' => $user->email,
        ])->assertAccepted();

        /** @var PasswordResetOtpNotification $notification */
        $notification = Notification::sent($user, PasswordResetOtpNotification::class)->sole();

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/v1/auth/password-reset/verify', [
                'email' => $user->email,
                'otp' => '000000',
            ])->assertUnprocessable()->assertJsonValidationErrors('otp');
        }

        $this->postJson('/api/v1/auth/password-reset/verify', [
            'email' => $user->email,
            'otp' => $notification->otp,
        ])->assertUnprocessable()->assertJsonValidationErrors('otp');
    }

    public function test_resending_invalidates_the_previous_otp(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/password-reset/request', [
            'email' => $user->email,
        ])->assertAccepted();
        /** @var PasswordResetOtpNotification $firstNotification */
        $firstNotification = Notification::sent($user, PasswordResetOtpNotification::class)->sole();

        $this->travel(61)->seconds();
        $this->postJson('/api/v1/auth/password-reset/request', [
            'email' => $user->email,
        ])->assertAccepted();

        $this->postJson('/api/v1/auth/password-reset/verify', [
            'email' => $user->email,
            'otp' => $firstNotification->otp,
        ])->assertUnprocessable()->assertJsonValidationErrors('otp');
    }

    public function test_locked_user_can_reset_password_without_becoming_active(): void
    {
        Notification::fake();
        $user = User::factory()->locked()->create(['password' => 'OldPass123!']);

        $this->postJson('/api/v1/auth/password-reset/request', [
            'email' => $user->email,
        ])->assertAccepted();
        /** @var PasswordResetOtpNotification $notification */
        $notification = Notification::sent($user, PasswordResetOtpNotification::class)->sole();
        $resetToken = $this->postJson('/api/v1/auth/password-reset/verify', [
            'email' => $user->email,
            'otp' => $notification->otp,
        ])->assertOk()->json('reset_token');

        $this->postJson('/api/v1/auth/password-reset/complete', [
            'email' => $user->email,
            'reset_token' => $resetToken,
            'password' => 'NewPass123!',
            'password_confirmation' => 'NewPass123!',
        ])->assertOk();

        $this->assertSame('locked', $user->fresh()->status);
        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'NewPass123!',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_password_validation_does_not_consume_the_reset_token(): void
    {
        Notification::fake();
        $user = User::factory()->create(['password' => 'OldPass123!']);

        $this->postJson('/api/v1/auth/password-reset/request', [
            'email' => $user->email,
        ])->assertAccepted();
        /** @var PasswordResetOtpNotification $notification */
        $notification = Notification::sent($user, PasswordResetOtpNotification::class)->sole();
        $resetToken = $this->postJson('/api/v1/auth/password-reset/verify', [
            'email' => $user->email,
            'otp' => $notification->otp,
        ])->assertOk()->json('reset_token');

        $this->postJson('/api/v1/auth/password-reset/complete', [
            'email' => $user->email,
            'reset_token' => $resetToken,
            'password' => 'short',
            'password_confirmation' => 'different',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->postJson('/api/v1/auth/password-reset/complete', [
            'email' => $user->email,
            'reset_token' => $resetToken,
            'password' => 'NewPass123!',
            'password_confirmation' => 'NewPass123!',
        ])->assertOk();

        $this->postJson('/api/v1/auth/password-reset/complete', [
            'email' => $user->email,
            'reset_token' => $resetToken,
            'password' => 'AnotherPass123!',
            'password_confirmation' => 'AnotherPass123!',
        ])->assertUnprocessable()->assertJsonValidationErrors('reset_token');
    }
}
