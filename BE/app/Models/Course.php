<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Course extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'title',
        'slug',
        'description',
        'thumbnail',
        'price',
        'instructor_name',
        'instructor_bio',
        'level',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
        ];
    }

    /**
     * Expand phase (P0 step D2): the legacy courses.category_id drives the approved
     * ERD course_categories pivot 1:1, so every existing writer — admin controller,
     * factory, seeders — populates the pivot without being touched.
     *
     * Only a create or an actual category_id change re-syncs, so categories attached
     * directly through the pivot are never clobbered. Delete together with the
     * courses.category_id column in the contract phase.
     */
    protected static function booted(): void
    {
        static::created(fn (self $course) => $course->mirrorLegacyCategoryToPivot());

        static::updated(function (self $course): void {
            if ($course->wasChanged('category_id')) {
                $course->mirrorLegacyCategoryToPivot($course->getOriginal('category_id'));
            }
        });
    }

    /**
     * Detaching only the previous primary — rather than sync()ing the whole set —
     * keeps categories attached straight through the pivot intact.
     */
    private function mirrorLegacyCategoryToPivot(int|string|null $previousCategoryId = null): void
    {
        if ($previousCategoryId !== null) {
            $this->categories()->detach($previousCategoryId);
        }

        if ($this->category_id !== null) {
            $this->categories()->syncWithoutDetaching([$this->category_id]);
        }
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Approved-ERD classification via the course_categories pivot. Coexists with the
     * legacy category() belongsTo until courses.category_id is dropped.
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'course_categories')->withTimestamps();
    }

    public function lessons(): HasMany
    {
        return $this->hasMany(Lesson::class)->orderBy('position');
    }

    public function exam(): HasOne
    {
        return $this->hasOne(Exam::class);
    }

    /**
     * Expand-phase alias for exam(). Admin\QuizController serialises raw models and
     * AdminCourseResource eager-loads by relation name, both of which the frontend
     * reads as `quiz`. Delete once the frontend moves to `exam` in P3.
     */
    public function quiz(): HasOne
    {
        return $this->exam();
    }

    public function questions(): HasManyThrough
    {
        return $this->hasManyThrough(
            Question::class,
            Exam::class,
            'course_id',
            'exam_id',
        );
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }
}
