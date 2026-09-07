<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserRecord extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'old_status',
        'new_status',
        'reason',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
