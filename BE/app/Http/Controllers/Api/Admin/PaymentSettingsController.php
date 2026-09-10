<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentSetting;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentSettingsController extends Controller
{
    public function show()
    {
        return response()->json(['data' => PaymentSetting::current()->configuration]);
    }

    public function update(Request $request)
    {
        $bankRequired = Rule::requiredIf($request->boolean('bank.enabled') && $request->boolean('bank.is_active'));
        $data = $request->validate([
            'momo' => ['required', 'array:enabled,mode,merchant_name'],
            'momo.enabled' => ['required', 'boolean'],
            'momo.mode' => ['required', 'in:mock'],
            'momo.merchant_name' => ['required', 'string', 'max:100'],
            'bank' => ['required', 'array:enabled,is_active,bank_name,account_name,account_number,branch,qr_payload,instructions'],
            'bank.enabled' => ['required', 'boolean'],
            'bank.is_active' => ['required', 'boolean'],
            'bank.bank_name' => [$bankRequired, 'nullable', 'string', 'max:100'],
            'bank.account_name' => [$bankRequired, 'nullable', 'string', 'max:100'],
            'bank.account_number' => [$bankRequired, 'nullable', 'string', 'max:50', 'regex:/^[a-zA-Z0-9 -]+$/'],
            'bank.branch' => ['nullable', 'string', 'max:100'],
            'bank.qr_payload' => ['nullable', 'string', 'max:1000'],
            'bank.instructions' => ['nullable', 'string', 'max:2000'],
        ]);
        PaymentSetting::current()->update(['configuration' => $data]);

        return $this->show();
    }
}
