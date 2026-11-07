<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class School extends Model
{
    use HasFactory;

    protected $table = 'schools';

    protected $fillable = [
        'school_code',
        'name',
        'short_name',
        'board',
        'school_type',
        'medium',
        'registration_no',
        'classes_from',
        'classes_to',
        'address_line1',
        'address_line2',
        'city',
        'district',
        'state',
        'pincode',
        'official_email',
        'phone',
        'website',
        'principal_name',
        'principal_phone',
        'campuses',
        'logo_file_id',
        'timezone',
        'onboarding_status',
        'account_status',
        'status_reason',
        'approved_by',
        'approved_at',
        'created_by',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'campuses' => 'integer',
    ];

    public function settings(): HasMany
    {
        return $this->hasMany(SchoolSetting::class, 'school_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(SchoolDocument::class, 'school_id');
    }

    public function activeSubscription(): HasOne
    {
        return $this->hasOne(SchoolSubscription::class, 'school_id')
            ->where('status', 'active')
            ->latestOfMany();
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(UserSchoolMembership::class, 'school_id');
    }

    public function staffAssignments(): HasMany
    {
        return $this->hasMany(PlatformStaffAssignment::class, 'school_id');
    }
}
