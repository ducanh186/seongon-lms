<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::where('role', 'student');

        if ($q = $request->query('q')) {
            $query->where(function ($w) use ($q) {
                $w->where('name', 'like', "%{$q}%")->orWhere('email', 'like', "%{$q}%");
            });
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return UserResource::collection($query->latest()->paginate(15)->withQueryString());
    }

    public function updateStatus(Request $request, User $user)
    {
        $data = $request->validate([
            'status' => ['required', 'in:active,locked'],
        ]);

        $user->status = $data['status'];
        $user->save();

        return new UserResource($user);
    }
}
