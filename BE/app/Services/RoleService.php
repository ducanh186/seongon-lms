<?php

namespace App\Services;

use App\Models\Role;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class RoleService
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginateForAdmin(array $filters = []): LengthAwarePaginator
    {
        return Role::query()
            ->withCount('users')
            ->when($filters['q'] ?? null, function (Builder $query, string $search): void {
                $query->where(function (Builder $roleQuery) use ($search): void {
                    $roleQuery->where('code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                });
            })
            ->orderBy('id')
            ->paginate(15)
            ->withQueryString();
    }
}
