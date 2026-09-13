<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;

class TeacherProfile extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'bio', 'avatar'];

    public function courses(): HasMany
    {
        return $this->hasMany(Course::class);
    }
}
