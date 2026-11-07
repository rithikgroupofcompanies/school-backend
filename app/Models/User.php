<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'users';

    protected $fillable = [
        'public_uuid',
        'email',
        'mobile',
        'password_hash',
        'full_name',
        'user_type',
        'status',
        'email_verified_at',
        'mfa_secret',
        'mfa_enabled',
        'failed_attempts',
        'locked_until',
        'last_login_at',
    ];

    protected $hidden = [
        'password_hash',
        'mfa_secret',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'locked_until' => 'datetime',
        'last_login_at' => 'datetime',
        'mfa_enabled' => 'boolean',
        'failed_attempts' => 'integer',
    ];

    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(UserSchoolMembership::class, 'user_id');
    }

    public function platformStaffProfile(): HasOne
    {
        return $this->hasOne(PlatformStaffProfile::class, 'user_id');
    }

    public function platformStaffAssignments(): HasMany
    {
        return $this->hasMany(PlatformStaffAssignment::class, 'staff_user_id');
    }

    public function loginSessions(): HasMany
    {
        return $this->hasMany(LoginSession::class, 'user_id');
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(Invitation::class, 'user_id');
    }

    public function isSuperAdmin(): bool
    {
        return $this->user_type === 'platform' &&
            $this->memberships()->whereHas('role', function ($q) {
                $q->where('name', 'Super Admin');
            })->exists();
    }

    public function isOpsStaff(): bool
    {
        return $this->user_type === 'platform' &&
            $this->memberships()->whereHas('role', function ($q) {
                $q->where('name', 'Operations Staff');
            })->exists();
    }
}
