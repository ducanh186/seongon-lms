<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\NewsPostResource;
use App\Models\NewsPost;
use Illuminate\Http\Request;

class NewsController extends Controller
{
    public function index(Request $request)
    {
        $publishedPosts = NewsPost::query()->published();
        $categories = (clone $publishedPosts)
            ->select('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->values();

        if ($request->filled('category')) {
            $publishedPosts->where('category', $request->string('category')->toString());
        }

        return NewsPostResource::collection($publishedPosts->latest('published_at')->paginate(12))
            ->additional(['categories' => $categories]);
    }

    public function show(string $slug)
    {
        $newsPost = NewsPost::query()
            ->published()
            ->where('slug', $slug)
            ->firstOrFail();

        return new NewsPostResource($newsPost);
    }
}
