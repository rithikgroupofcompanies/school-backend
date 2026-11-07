<?php

namespace App\Models;

use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AcademicYear extends Model
{
    use HasFactory, BelongsToSchool;

    protected $table = 'academic_years';

    protected $fillable = [
        'school_id',
        'name',
        'start_date',
        'end_date',
        'status',
        'admission_window_start',
        'admission_window_end',
        'promotion_date',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'admission_window_start' => 'date',
        'admission_window_end' => 'date',
        'promotion_date' => 'date',
    ];

    public function classes(): HasMany
    {
        return $this->hasMany(SchoolClass::class, 'academic_year_id');
    }

    public function terms(): HasMany
    {
        return $this->hasMany(Term::class, 'academic_year_id')->orderBy('seq');
    }
}
