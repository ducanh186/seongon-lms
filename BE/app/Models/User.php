<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

// role_id is deliberately NOT mass assignable, matching the legacy role column.
// updateProfile() feeds request input straight into User::update(), so role
// assignment stays server-controlled: set it directly, never via fill().
#[Fillable(['name', 'email', 'password', 'phone', 'avatar'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Expand phase (P0 step D1): the legacy users.role string and the approved ERD
     * users.role_id are kept in sync in both directions, so existing readers of
     * ->role and new readers of ->role_id/->role() agree. Delete together with the
     * users.role column in the contract phase.
     */
    protected static function booted(): void
    {
        static::saving(function (self $user): void {
            $idByCode = Role::query()->pluck('id', 'code');

            if ($user->isDirty('role_id') && ! $user->isDirty('role')) {
                $user->role = $idByCode->flip()[$user->role_id] ?? $user->role;

                return;
            }

            // users.role is often left unset so the column default applies —
            // see AuthController::register() and the users table migration.
            $user->role_id = $idByCode[$user->role ?? 'student'] ?? $user->role_id;
        });
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }
}
