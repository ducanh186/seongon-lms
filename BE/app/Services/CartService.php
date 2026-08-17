<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Order;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CartService
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginateForAdmin(array $filters = []): LengthAwarePaginator
    {
        return Cart::query()
            ->with(['user', 'items.user', 'items.course'])
            ->withCount('items')
            ->when($filters['q'] ?? null, function (Builder $query, string $search): void {
                $query->whereHas('user', function (Builder $userQuery) use ($search): void {
                    $userQuery->where(function (Builder $identityQuery) use ($search): void {
                        $identityQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
                });
            })
            ->when(($filters['state'] ?? null) === 'empty', fn (Builder $query) => $query->doesntHave('items'))
            ->when(($filters['state'] ?? null) === 'non_empty', fn (Builder $query) => $query->has('items'))
            ->latest('updated_at')
            ->paginate(15)
            ->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginateItemsForAdmin(array $filters = []): LengthAwarePaginator
    {
        return CartItem::query()
            ->with(['cart.user', 'user', 'course'])
            ->when($filters['q'] ?? null, function (Builder $query, string $search): void {
                $query->where(function (Builder $itemQuery) use ($search): void {
                    $itemQuery
                        ->whereHas('user', function (Builder $userQuery) use ($search): void {
                            $userQuery->where(function (Builder $identityQuery) use ($search): void {
                                $identityQuery->where('name', 'like', "%{$search}%")
                                    ->orWhere('email', 'like', "%{$search}%");
                            });
                        })
                        ->orWhereHas('course', fn (Builder $courseQuery) => $courseQuery->where('title', 'like', "%{$search}%"));
                });
            })
            ->when($filters['course_id'] ?? null, fn (Builder $query, int $courseId) => $query->where('course_id', $courseId))
            ->latest('created_at')
            ->paginate(15)
            ->withQueryString();
    }

    public function forUser(User $user): ?Cart
    {
        $cart = Cart::query()
            ->where('user_id', $user->id)
            ->with('items.course')
            ->first();

        if ($cart === null) {
            return null;
        }

        $ownedCourseIds = Enrollment::query()
            ->where('user_id', $user->id)
            ->where('expires_at', '>', now())
            ->pluck('course_id');

        $invalidItemIds = $cart->items
            ->filter(fn (CartItem $item): bool => $item->course === null
                || $item->course->status !== 'published'
                || $ownedCourseIds->contains($item->course_id))
            ->pluck('id');

        if ($invalidItemIds->isNotEmpty()) {
            CartItem::query()->whereKey($invalidItemIds)->delete();
            $cart->load('items.course');
        }

        return $cart;
    }

    /**
     * @return array{cart: Cart, created: bool}
     */
    public function add(User $user, Course $course): array
    {
        abort_if($course->status !== 'published', 422, 'Khóa học không còn mở đăng ký.');
        $this->assertCourseIsNotOwned($user, $course->id);

        return DB::transaction(function () use ($course, $user): array {
            // Serializing on the User row prevents two concurrent requests from
            // creating separate active carts without changing the approved ERD.
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            $cart = Cart::query()->firstOrCreate(
                ['user_id' => $user->id],
                ['course_id' => null],
            );

            $item = CartItem::query()->firstOrCreate([
                'cart_id' => $cart->id,
                'course_id' => $course->id,
            ], [
                'user_id' => $user->id,
            ]);

            return [
                'cart' => $cart->load('items.course'),
                'created' => $item->wasRecentlyCreated,
            ];
        });
    }

    public function remove(User $user, CartItem $item): ?Cart
    {
        $item->loadMissing('cart');
        abort_unless($item->cart?->user_id === $user->id, 403);

        $cart = $item->cart;
        $item->delete();

        return $cart?->load('items.course');
    }

    public function clear(User $user): void
    {
        DB::transaction(function () use ($user): void {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            Cart::query()->where('user_id', $user->id)->delete();
        });
    }

    public function createPendingOrder(User $user, int $courseId): Order
    {
        $order = DB::transaction(function () use ($courseId, $user): ?Order {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();

            $item = CartItem::query()
                ->where('course_id', $courseId)
                ->whereHas('cart', fn ($query) => $query->where('user_id', $user->id))
                ->lockForUpdate()
                ->first();

            if ($item === null) {
                throw ValidationException::withMessages([
                    'course_id' => ['Khóa học không có trong giỏ hàng của bạn.'],
                ]);
            }

            $course = Course::query()
                ->published()
                ->whereKey($item->course_id)
                ->lockForUpdate()
                ->first();

            if ($course === null) {
                $item->delete();

                return null;
            }

            $this->assertCourseIsNotOwned($user, $course->id);

            $order = Order::query()
                ->where('user_id', $user->id)
                ->where('course_id', $course->id)
                ->whereIn('status', ['pending', 'failed'])
                ->oldest('id')
                ->lockForUpdate()
                ->first();

            if ($order !== null) {
                // A pending Order with a key has already entered the payment
                // attempt. Its amount and key stay immutable until finalize.
                if ($order->status === 'pending' && $order->transaction_ref !== null) {
                    return $order;
                }

                $order->update([
                    'amount' => $course->price,
                    'status' => 'pending',
                    'payment_method' => null,
                    'transaction_ref' => null,
                    'paid_at' => null,
                ]);

                return $order;
            }

            return Order::query()->create([
                'user_id' => $user->id,
                'course_id' => $course->id,
                'amount' => $course->price,
                'status' => 'pending',
            ]);
        });

        if ($order === null) {
            throw ValidationException::withMessages([
                'course_id' => ['Khóa học không còn mở đăng ký.'],
            ]);
        }

        return $order;
    }

    public function removePurchasedItem(Order $order): void
    {
        CartItem::query()
            ->where('user_id', $order->user_id)
            ->where('course_id', $order->course_id)
            ->whereHas('cart', fn ($query) => $query->where('user_id', $order->user_id))
            ->delete();
    }

    private function assertCourseIsNotOwned(User $user, int $courseId): void
    {
        $isOwned = Enrollment::query()
            ->where('user_id', $user->id)
            ->where('course_id', $courseId)
            ->where('expires_at', '>', now())
            ->exists();

        abort_if($isOwned, 422, 'Bạn đã sở hữu khóa học này.');
    }
}
