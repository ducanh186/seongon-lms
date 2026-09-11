<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['email', 'otp_hash', 'attempts', 'expires_at', 'verified_at', 'reset_token_hash', 'reset_expires_at'])]
class PasswordResetChallenge extends Model
{
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'verified_at' => 'datetime',
            'reset_expires_at' => 'datetime',
        ];
    }
}
