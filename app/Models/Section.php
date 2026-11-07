<?php

namespace App\Models;

use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Section extends Model
{
    use HasFactory, BelongsToSchool;

    protected $table = 'sections';

    protected $fillable = [
        'school_id',
        'class_id',
        'name',
        'class_teacher_staff_id',
        'room_id',
        'capacity',
    ];

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function classTeacher(): BelongsTo
    {
        return $this->belongsTo(StaffProfile::class, 'class_teacher_staff_id');
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class, 'room_id');
    }
}
