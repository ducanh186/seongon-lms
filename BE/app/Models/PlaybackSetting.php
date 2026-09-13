<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlaybackSetting extends Model
{
    protected $fillable = ['id', 'anti_cheat_enabled'];

    protected function casts(): array
    {
        return ['anti_cheat_enabled' => 'boolean'];
    }

    public static function current(): self
    {
        return self::firstOrCreate(['id' => 1], ['anti_cheat_enabled' => true]);
    }
}
