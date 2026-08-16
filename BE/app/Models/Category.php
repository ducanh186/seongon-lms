<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Category extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'slug', 'description'];

    /**
     * Reads the approved ERD course_categories pivot rather than the legacy
     * courses.category_id column. Course keeps the two in parity during the expand
     * phase, so counts and listings are unchanged.
     */
    public function courses(): BelongsToMany
    {
        return $this->belongsToMany(Course::class, 'course_categories')->withTimestamps();
    }
}
