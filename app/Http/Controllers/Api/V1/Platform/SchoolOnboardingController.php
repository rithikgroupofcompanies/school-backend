<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\CreateSchoolRequest;
use App\Models\Invitation;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolSetting;
use App\Models\SchoolSubscription;
use App\Models\User;
use App\Models\UserSchoolMembership;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SchoolOnboardingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = School::query();

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('school_code', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%");
            });
        }

        if ($request->has('onboarding_status')) {
            $query->where('onboarding_status', $request->get('onboarding_status'));
        }

        if ($request->has('account_status')) {
            $query->where('account_status', $request->get('account_status'));
        }

        $schools = $query->with(['documents', 'activeSubscription'])
            ->orderByDesc('id')
            ->paginate(15);

        return response()->json($schools);
    }

    public function store(CreateSchoolRequest $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            // Generate unique human-readable school code SCH-XXXXXX
            $schoolCode = 'SCH-' . strtoupper(Str::random(6));

            $schoolData = $request->safe()->except([
                'admin_full_name', 'admin_email', 'admin_mobile', 'admin_designation'
            ]);
            $schoolData['school_code'] = $schoolCode;
            $schoolData['onboarding_status'] = 'draft';
            $schoolData['account_status'] = 'pending';
            $schoolData['created_by'] = $request->user()->id;

            $school = School::create($schoolData);

            // Create initial School Admin user in pending state
            $adminUser = User::create([
                'public_uuid' => (string) Str::uuid(),
                'email' => Str::lower($request->validated('admin_email')),
                'mobile' => $request->validated('admin_mobile'),
                'password_hash' => Hash::make(Str::random(32)), // Random secure password until activation
                'full_name' => $request->validated('admin_full_name'),
                'user_type' => 'school',
                'status' => 'pending',
            ]);

            // Assign standard system School Admin role
            $schoolAdminRole = Role::whereNull('school_id')->where('name', 'School Admin')->first();
            UserSchoolMembership::create([
                'user_id' => $adminUser->id,
                'school_id' => $school->id,
                'role_id' => $schoolAdminRole->id,
                'status' => 'active',
            ]);

            // Initialize default school settings
            SchoolSetting::create([
                'school_id' => $school->id,
                'key' => 'general_preferences',
                'value' => [
                    'academic_session_start_month' => 6, // June
                    'attendance_mode' => 'daily',
                    'default_grading_scale' => 'standard_letter',
                ],
            ]);

            // Default pilot subscription
            SchoolSubscription::create([
                'school_id' => $school->id,
                'plan_code' => 'enterprise_pilot',
                'valid_from' => now()->toDateString(),
                'valid_to' => now()->addYear()->toDateString(),
                'student_limit' => 1000,
                'user_limit' => 100,
                'status' => 'active',
            ]);

            AuditLogService::log(
                action: 'school.draft_created',
                entity: $school,
                newValues: ['name' => $school->name, 'code' => $school->school_code]
            );

            return response()->json([
                'message' => 'School draft created successfully.',
                'school' => $school,
            ], 201);
        });
    }

    public function submit(School $school): JsonResponse
    {
        if ($school->onboarding_status !== 'draft') {
            return response()->json(['message' => 'Only draft schools can be submitted.'], 422);
        }

        $school->update(['onboarding_status' => 'submitted']);

        AuditLogService::log(action: 'school.submitted_for_verification', entity: $school);

        return response()->json([
            'message' => 'School submitted for verification.',
            'school' => $school,
        ]);
    }

    public function approve(Request $request, School $school): JsonResponse
    {
        $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        return DB::transaction(function () use ($request, $school) {
            $school->update([
                'onboarding_status' => 'approved',
                'account_status' => 'active',
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
            ]);

            // Generate single-use activation invitation for the School Admin
            $membership = UserSchoolMembership::where('school_id', $school->id)
                ->whereHas('role', function ($q) {
                    $q->where('name', 'School Admin');
                })
                ->first();

            $adminUser = $membership->user;
            $rawToken = Str::random(40);
            $tokenHash = hash('sha256', $rawToken);

            Invitation::create([
                'user_id' => $adminUser->id,
                'purpose' => 'activation',
                'token_hash' => $tokenHash,
                'expires_at' => now()->addHours(48),
                'created_at' => now(),
            ]);

            AuditLogService::log(
                action: 'school.approved_and_provisioned',
                entity: $school,
                reason: $request->input('reason', 'School documentation verified and approved.')
            );

            // In production this triggers an activation email with the link:
            // $activationUrl = config('app.frontend_url') . "/activate?token={$rawToken}";

            return response()->json([
                'message' => 'School approved and provisioned successfully.',
                'school' => $school,
                'activation_token' => $rawToken, // Provided in response for verification
            ]);
        });
    }

    public function suspend(Request $request, School $school): JsonResponse
    {
        $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        $oldStatus = $school->account_status;
        $school->update([
            'account_status' => 'suspended',
            'status_reason' => $request->input('reason'),
        ]);

        // Revoke active sessions for all users of this school
        DB::table('login_sessions')->where('school_id', $school->id)->update([
            'revoked_at' => now(),
        ]);

        AuditLogService::log(
            action: 'school.suspended',
            entity: $school,
            oldValues: ['status' => $oldStatus],
            newValues: ['status' => 'suspended'],
            reason: $request->input('reason')
        );

        return response()->json([
            'message' => 'School successfully suspended. All active sessions have been revoked.',
            'school' => $school,
        ]);
    }

    public function reactivate(Request $request, School $school): JsonResponse
    {
        $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        $oldStatus = $school->account_status;
        $school->update([
            'account_status' => 'active',
            'status_reason' => $request->input('reason'),
        ]);

        AuditLogService::log(
            action: 'school.reactivated',
            entity: $school,
            oldValues: ['status' => $oldStatus],
            newValues: ['status' => 'active'],
            reason: $request->input('reason')
        );

        return response()->json([
            'message' => 'School successfully reactivated.',
            'school' => $school,
        ]);
    }
}
