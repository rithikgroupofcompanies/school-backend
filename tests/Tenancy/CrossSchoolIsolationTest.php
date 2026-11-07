<?php

namespace Tests\Tenancy;

use App\Models\School;
use App\Models\User;
use App\Models\Role;
use App\Models\UserSchoolMembership;
use App\Models\PlatformStaffAssignment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrossSchoolIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected School $schoolA;
    protected School $schoolB;
    protected User $schoolAAdmin;
    protected User $opsStaffAssignedOnlyToA;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create two distinct school tenants
        $this->schoolA = School::factory()->create([
            'school_code' => 'SCH-AAA111',
            'name' => 'School Alpha',
            'account_status' => 'active',
            'onboarding_status' => 'approved',
        ]);

        $this->schoolB = School::factory()->create([
            'school_code' => 'SCH-BBB222',
            'name' => 'School Beta',
            'account_status' => 'active',
            'onboarding_status' => 'approved',
        ]);

        $schoolAdminRole = Role::firstOrCreate(
            ['school_id' => null, 'name' => 'School Admin'],
            ['scope' => 'school', 'is_system' => true]
        );

        $opsStaffRole = Role::firstOrCreate(
            ['school_id' => null, 'name' => 'Operations Staff'],
            ['scope' => 'platform', 'is_system' => true]
        );

        // 2. User belonging to School A
        $this->schoolAAdmin = User::factory()->create(['user_type' => 'school', 'status' => 'active']);
        UserSchoolMembership::create([
            'user_id' => $this->schoolAAdmin->id,
            'school_id' => $this->schoolA->id,
            'role_id' => $schoolAdminRole->id,
            'status' => 'active',
        ]);

        // 3. Ops staff assigned strictly to School A
        $this->opsStaffAssignedOnlyToA = User::factory()->create(['user_type' => 'platform', 'status' => 'active']);
        UserSchoolMembership::create([
            'user_id' => $this->opsStaffAssignedOnlyToA->id,
            'school_id' => $this->schoolA->id,
            'role_id' => $opsStaffRole->id,
            'status' => 'active',
        ]);
        PlatformStaffAssignment::create([
            'staff_user_id' => $this->opsStaffAssignedOnlyToA->id,
            'school_id' => $this->schoolA->id,
            'assignment_type' => 'verification',
            'permitted_operations' => ['students.verify', 'marks.review'],
            'start_date' => now()->subDay()->toDateString(),
            'status' => 'active',
            'assigned_by' => 1,
        ]);
    }

    /** @test */
    public function school_a_user_cannot_access_school_b_profile()
    {
        $response = $this->actingAs($this->schoolAAdmin)
            ->getJson("/api/v1/schools/{$this->schoolB->id}/profile");

        // Must fail with 403 Forbidden
        $response->assertStatus(403);
    }

    /** @test */
    public function ops_staff_cannot_access_unassigned_school_b()
    {
        $response = $this->actingAs($this->opsStaffAssignedOnlyToA)
            ->getJson("/api/v1/schools/{$this->schoolB->id}/profile");

        // Must fail with 403 Unauthorized
        $response->assertStatus(403);
    }
}
