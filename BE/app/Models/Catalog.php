<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Catalog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['name', 'description'];
}
