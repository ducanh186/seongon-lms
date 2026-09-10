<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Catalog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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
        $catalog->update($this->validateData($request, $catalog));

        return response()->json(['data' => $catalog]);
    }

    public function destroy(Catalog $catalog)
    {
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
