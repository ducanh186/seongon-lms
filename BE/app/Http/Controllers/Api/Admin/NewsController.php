<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\NewsPostResource;
use App\Models\NewsPost;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class NewsController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:draft,published'],
            'category' => ['nullable', 'string', 'max:100'],
        ]);
        $categories = NewsPost::query()->distinct()->orderBy('category')->pluck('category')->values();
        $query = NewsPost::query()->latest();

        if ($search = $filters['q'] ?? null) {
            $query->where(function ($newsQuery) use ($search): void {
                $newsQuery->where('title', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%")
                    ->orWhere('excerpt', 'like', "%{$search}%");
            });
        }

        if ($status = $filters['status'] ?? null) {
            $query->where('status', $status);
        }

        if ($category = $filters['category'] ?? null) {
            $query->where('category', $category);
        }

        return NewsPostResource::collection($query->paginate(15)->withQueryString())
            ->additional(['categories' => $categories]);
    }

    public function store(Request $request)
    {
        $data = $this->validatedData($request);
        $data['published_at'] = $data['status'] === 'published' ? now() : null;

        $newsPost = $this->createWithUniqueSlug($data);

        return (new NewsPostResource($newsPost))->response()->setStatusCode(201);
    }

    public function show(NewsPost $news)
    {
        return new NewsPostResource($news);
    }

    public function update(Request $request, NewsPost $news)
    {
        $data = $this->validatedData($request);

        if ($news->status === 'draft' && $data['status'] === 'published') {
            $data['published_at'] = now();
        } elseif ($news->status === 'published' && $data['status'] === 'draft') {
            $data['published_at'] = null;
        }

        $news->update($data);

        return new NewsPostResource($news);
    }

    public function destroy(NewsPost $news)
    {
        $news->delete();

        return response()->noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'excerpt' => ['required', 'string', 'max:500'],
            'content' => ['required', 'string'],
            'thumbnail' => ['nullable', 'url', 'max:2048'],
            'status' => ['required', 'in:draft,published'],
        ]);
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $i = 1;

        while (NewsPost::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function createWithUniqueSlug(array $data): NewsPost
    {
        while (true) {
            $data['slug'] = $this->uniqueSlug($data['title']);

            try {
                return NewsPost::create($data);
            } catch (QueryException $exception) {
                if (! $this->isSlugUniqueConstraint($exception)) {
                    throw $exception;
                }
            }
        }
    }

    private function isSlugUniqueConstraint(QueryException $exception): bool
    {
        if (! $exception instanceof UniqueConstraintViolationException
            && ! in_array($exception->getCode(), ['23000', '23505'], true)) {
            return false;
        }

        return str_contains($exception->getMessage(), 'news_posts.slug')
            || str_contains($exception->getMessage(), 'news_posts_slug_unique');
    }
}
