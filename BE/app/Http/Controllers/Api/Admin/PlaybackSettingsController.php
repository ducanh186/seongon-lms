<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlaybackSetting;
use Illuminate\Http\Request;

class PlaybackSettingsController extends Controller
{
    public function show()
    {
        return response()->json(['data' => PlaybackSetting::current()]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'anti_cheat_enabled' => ['required', 'boolean'],
        ]);

        PlaybackSetting::current()->update($data);

        return $this->show();
    }
}
