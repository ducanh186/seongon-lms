<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Catalog;
use App\Models\NewsPost;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CatalogController extends Controller
{
    public function index()
    {
        return response()->json(['data' => Catalog::query()->orderBy('name')->get()]);
    }

    public function store(Request $request)
    {
        return response()->json(['data' => Catalog::create($this->validateData($request))], 201);
    }

    public function update(Request $request, Catalog $catalog)
    {
        $data = $this->validateData($request, $catalog);
        DB::transaction(function () use ($catalog, $data): void {
            $oldName = $catalog->name;
            $catalog->update($data);
            if ($oldName !== $catalog->name) {
                NewsPost::query()->where('category', $oldName)->update(['category' => $catalog->name]);
            }
        });

        return response()->json(['data' => $catalog]);
    }

    public function destroy(Catalog $catalog)
    {
        if (NewsPost::query()->where('category', $catalog->name)->exists()) {
            throw ValidationException::withMessages([
                'catalog' => ['Không thể xóa danh mục đang được tin tức sử dụng.'],
            ]);
        }
        $catalog->delete();

        return response()->noContent();
    }

    private function validateData(Request $request, ?Catalog $catalog = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('catalogs')->ignore($catalog)],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);
    }
}
