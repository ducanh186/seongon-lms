<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = $request->user();

        if ($user === null || $user->role !== $role) {
            abort(403, 'Bạn không có quyền truy cập tài nguyên này.');
        }

        if ($user->status === 'locked') {
            abort(403, 'Tài khoản đã bị khóa.');
        }

        return $next($request);
    }
}
