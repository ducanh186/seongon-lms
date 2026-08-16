<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\CartResource;
use App\Models\CartItem;
use App\Models\Course;
use App\Services\CartService;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function __construct(private readonly CartService $carts) {}

    public function show(Request $request)
    {
        $cart = $this->carts->forUser($request->user());

        if ($cart === null) {
            return response()->json(['data' => [
                'id' => null,
                'user_id' => $request->user()->id,
                'items' => [],
                'count' => 0,
                'total_amount' => '0.00',
                'updated_at' => null,
            ]]);
        }

        return new CartResource($cart);
    }

    public function storeItem(Request $request)
    {
        $data = $request->validate([
            'course_id' => ['required', 'integer', 'exists:courses,id'],
        ]);

        $course = Course::query()->findOrFail($data['course_id']);
        $result = $this->carts->add($request->user(), $course);
        $response = new CartResource($result['cart']);

        return $result['created']
            ? $response->response()->setStatusCode(201)
            : $response;
    }

    public function destroyItem(Request $request, CartItem $cartItem)
    {
        $cart = $this->carts->remove($request->user(), $cartItem);

        return new CartResource($cart);
    }

    public function destroy(Request $request)
    {
        $this->carts->clear($request->user());

        return response()->noContent();
    }
}
