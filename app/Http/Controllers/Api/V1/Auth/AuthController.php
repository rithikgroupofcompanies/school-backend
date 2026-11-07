<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ActivateAccountRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\Invitation;
use App\Models\LoginSession;
use App\Models\SecurityEvent;
use App\Models\User;
use App\Services\AuditLogService;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $email = Str::lower($request->validated('email'));
        $user = User::where('email', $email)->first();

        // Security: Lockout check
        if ($user && $user->locked_until && $user->locked_until->isFuture()) {
            SecurityEvent::create([
                'user_id' => $user->id,
                'event_type' => 'login_locked_out_attempt',
                'ip' => $request->ip(),
                'details' => ['email' => $email],
            ]);

            return response()->json([
                'message' => 'Account temporarily locked due to repeated failed login attempts. Please try again later.'
            ], 423);
        }

        // Verify password
        if (!$user || !Hash::check($request->validated('password'), $user->password_hash)) {
            if ($user) {
                $user->increment('failed_attempts');
                if ($user->failed_attempts >= 5) {
                    $user->update(['locked_until' => now()->addMinutes(15)]);
                }
            }

            SecurityEvent::create([
                'user_id' => $user?->id,
                'event_type' => 'failed_login_bad_credentials',
                'ip' => $request->ip(),
                'details' => ['email' => $email],
            ]);

            return response()->json(['message' => 'Invalid email or password.'], 401);
        }

        // Account status check
        if ($user->status !== 'active') {
            return response()->json(['message' => 'Your account is not active.'], 403);
        }

        // TOTP MFA verification for platform staff & super admin
        if ($user->user_type === 'platform' || $user->mfa_enabled) {
            $mfaCode = $request->validated('mfa_code');
            if (empty($mfaCode)) {
                return response()->json([
                    'mfa_required' => true,
                    'message' => 'MFA code is required for platform authentication.'
                ], 200);
            }

            $google2fa = new Google2FA();
            $valid = $google2fa->verifyKey($user->mfa_secret, $mfaCode);
            if (!$valid) {
                SecurityEvent::create([
                    'user_id' => $user->id,
                    'event_type' => 'failed_mfa_code',
                    'ip' => $request->ip(),
                ]);

                return response()->json(['message' => 'Invalid MFA code.'], 401);
            }
        }

        // Reset failed attempts
        $user->update([
            'failed_attempts' => 0,
            'locked_until' => null,
            'last_login_at' => now(),
        ]);

        // Get active memberships
        $memberships = $user->memberships()
            ->with(['school:id,name,short_name,school_code', 'role:id,name,scope'])
            ->where('status', 'active')
            ->get();

        // Multi-school selection check
        $selectedSchoolId = $request->validated('school_id');
        if (!$selectedSchoolId && $memberships->count() > 1) {
            return response()->json([
                'multiple_memberships' => true,
                'memberships' => $memberships,
                'message' => 'Please select the school context you wish to access.'
            ]);
        }

        $activeMembership = $selectedSchoolId 
            ? $memberships->firstWhere('school_id', $selectedSchoolId)
            : $memberships->first();

        // Issue Sanctum Token / Session
        $token = $user->createToken('auth-token')->plainTextToken;

        // Record auditable login session
        LoginSession::create([
            'user_id' => $user->id,
            'school_id' => $activeMembership?->school_id,
            'token_hash' => hash('sha256', $token),
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
            'last_seen_at' => now(),
            'expires_at' => now()->addHours(8),
        ]);

        AuditLogService::log(
            action: 'auth.login_success',
            entity: $user,
            schoolId: $activeMembership?->school_id
        );

        return response()->json([
            'token' => $token,
            'user' => [
                'uuid' => $user->public_uuid,
                'name' => $user->full_name,
                'email' => $user->email,
                'user_type' => $user->user_type,
            ],
            'active_membership' => $activeMembership,
            'available_memberships' => $memberships,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $membership = $request->attributes->get('membership') 
            ?? $user->memberships()->with(['school', 'role.permissions'])->where('status', 'active')->first();

        $permissions = $membership?->role?->permissions->pluck('key')->toArray() ?? [];
        if ($user->isSuperAdmin()) {
            $permissions = ['*'];
        }

        return response()->json([
            'user' => [
                'id' => $user->id,
                'uuid' => $user->public_uuid,
                'name' => $user->full_name,
                'email' => $user->email,
                'user_type' => $user->user_type,
            ],
            'school' => CurrentSchool::get(),
            'role' => $membership?->role?->name,
            'permissions' => $permissions,
        ]);
    }

    public function activateAccount(ActivateAccountRequest $request): JsonResponse
    {
        $tokenHash = hash('sha256', $request->validated('token'));
        $invitation = Invitation::where('token_hash', $tokenHash)
            ->where('purpose', 'activation')
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();

        if (!$invitation) {
            return response()->json([
                'message' => 'This invitation link is invalid or has expired.'
            ], 422);
        }

        $user = $invitation->user;
        $user->update([
            'password_hash' => Hash::make($request->validated('password')),
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $invitation->update(['used_at' => now()]);

        AuditLogService::log(
            action: 'auth.account_activated',
            entity: $user
        );

        return response()->json([
            'message' => 'Account successfully activated. You can now log in.'
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user) {
            $user->currentAccessToken()?->delete();
            AuditLogService::log(action: 'auth.logout', entity: $user);
        }

        return response()->json(['message' => 'Logged out successfully.']);
    }
}
