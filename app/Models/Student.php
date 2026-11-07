<?php

namespace App\Models;

use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Student extends Model
{
    use HasFactory, SoftDeletes, BelongsToSchool;

    protected $table = 'students';

    protected $fillable = [
        'public_uuid',
        'school_id',
        'admission_no',
        'full_name',
        'date_of_birth',
        'gender',
        'photo_file_id',
        'nationality',
        'language',
        'admission_date',
        'admission_type',
        'status',
        'verification_status',
        'created_by',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'admission_date' => 'date',
    ];

    public function enrolments(): HasMany
    {
        return $this->hasMany(StudentEnrolment::class, 'student_id');
    }

    public function currentEnrolment()
    {
        return $this->hasOne(StudentEnrolment::class, 'student_id')
            ->where('status', 'active')
            ->latestOfMany();
    }

    public function guardians(): BelongsToMany
    {
        return $this->belongsToMany(Guardian::class, 'student_guardians', 'student_id', 'guardian_id')
            ->withPivot('relationship', 'is_primary', 'is_emergency', 'portal_access');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(StudentDocument::class, 'student_id');
    }
}
