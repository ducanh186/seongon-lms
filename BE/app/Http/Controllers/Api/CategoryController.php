<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::withCount(['courses' => fn ($q) => $q->where('status', 'published')])
            ->orderBy('name')
            ->get();

        return CategoryResource::collection($categories);
    }
}
