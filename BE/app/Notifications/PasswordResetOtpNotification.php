<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PasswordResetOtpNotification extends Notification
{
    use Queueable;

    public function __construct(public readonly string $otp) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Mã OTP đặt lại mật khẩu SEONGON LMS')
            ->line("Mã OTP đặt lại mật khẩu của bạn là: {$this->otp}")
            ->line('Mã này hết hạn sau '.config('password_reset.otp_expire_minutes').' phút.');
    }
}
