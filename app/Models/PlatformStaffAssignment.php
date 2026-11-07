<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlatformStaffAssignment extends Model
{
    use HasFactory;

    protected $table = 'platform_staff_assignments';

    protected $fillable = [
        'staff_user_id',
        'school_id',
        'assignment_type',
        'permitted_operations',
        'start_date',
        'end_date',
        'status',
        'assigned_by',
    ];

    protected $casts = [
        'permitted_operations' => 'array',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function staffUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_user_id');
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class, 'school_id');
    }

    public function assignedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function isActive(): bool
    {
        if ($this->status !== 'active') {
            return false;
        }

        $today = now()->toDateString();
        if ($this->start_date > $today) {
            return false;
        }

        if ($this->end_date && $this->end_date < $today) {
            return false;
        }

        return true;
    }
}
