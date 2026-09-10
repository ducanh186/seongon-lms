<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserRecordResource;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query()->withCount('enrollments')->with('role');

        if ($q = $request->query('q')) {
            $query->where(function ($w) use ($q) {
                $w->where('name', 'like', "%{$q}%")->orWhere('email', 'like', "%{$q}%");
            });
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($role = $request->query('role')) {
            $query->whereHas('role', fn ($roles) => $roles->where('code', $role));
        }

        return UserResource::collection($query->latest()->paginate(15)->withQueryString());
    }

    public function show(User $user)
    {
        return new UserResource($user->load('role')->loadCount('enrollments'));
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
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        if ($user->status !== $data['status']) {
            DB::transaction(function () use ($data, $user): void {
                $oldStatus = $user->status;
                $user->status = $data['status'];
                $user->save();
                $user->statusRecords()->create([
                    'old_status' => $oldStatus,
                    'new_status' => $data['status'],
                    'reason' => $data['reason'],
                ]);
            });
        }

        return new UserResource($user);
    }

    public function records(User $user)
    {
        return UserRecordResource::collection($user->statusRecords()->latest('created_at')->latest('id')->get());
    }
}
