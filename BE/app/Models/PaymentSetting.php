<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentSetting extends Model
{
    protected $fillable = ['id', 'configuration'];

    protected function casts(): array
    {
        return ['configuration' => 'array'];
    }

    public static function current(): self
    {
        return self::firstOrCreate(['id' => 1], ['configuration' => [
            'momo' => ['enabled' => true, 'mode' => 'mock', 'merchant_name' => 'SEONGON Academy'],
            'bank' => ['enabled' => false, 'is_active' => false, 'bank_name' => '', 'account_name' => '', 'account_number' => '', 'branch' => '', 'qr_payload' => '', 'instructions' => ''],
        ]]);
    }
}
