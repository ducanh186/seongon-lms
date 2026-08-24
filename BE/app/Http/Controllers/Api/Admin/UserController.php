<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query()->withCount('enrollments');

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

    public function updateRole(Request $request, User $user)
    {
        $data = $request->validate([
            'role' => ['required', 'string', Rule::exists('roles', 'code')],
        ]);

        $role = Role::query()->where('code', $data['role'])->firstOrFail();
        $user->role = $role->code;
        $user->role_id = $role->id;
        $user->save();

        return new UserResource($user->fresh());
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
