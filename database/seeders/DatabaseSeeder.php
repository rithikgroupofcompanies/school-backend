<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\UserSchoolMembership;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Permissions from Blueprint Section 2.3
        $permissions = [
            // Platform
            ['key' => 'schools.create', 'module' => 'Platform', 'scope' => 'platform', 'description' => 'Create draft school records'],
            ['key' => 'schools.approve', 'module' => 'Platform', 'scope' => 'platform', 'description' => 'Approve and provision verified schools'],
            ['key' => 'schools.suspend', 'module' => 'Platform', 'scope' => 'platform', 'description' => 'Suspend or reactivate school tenants with reason'],
            ['key' => 'schools.view_all', 'module' => 'Platform', 'scope' => 'platform', 'description' => 'View all schools across the platform'],
            ['key' => 'platform_staff.manage', 'module' => 'Platform', 'scope' => 'platform', 'description' => 'Create and manage platform operations staff'],
            ['key' => 'assignments.manage', 'module' => 'Platform', 'scope' => 'platform', 'description' => 'Assign operations staff to schools'],
            ['key' => 'audit.view_all', 'module' => 'Platform', 'scope' => 'platform', 'description' => 'View all platform and school audit trails'],
            ['key' => 'subscriptions.manage', 'module' => 'Platform', 'scope' => 'platform', 'description' => 'Manage school plans and limits'],

            // School setup
            ['key' => 'school.configure', 'module' => 'School Setup', 'scope' => 'school', 'description' => 'Configure school profile, timezone and branding'],
            ['key' => 'academic_year.manage', 'module' => 'School Setup', 'scope' => 'school', 'description' => 'Manage academic years and terms'],
            ['key' => 'classes.manage', 'module' => 'School Setup', 'scope' => 'school', 'description' => 'Manage classes and sections'],
            ['key' => 'subjects.manage', 'module' => 'School Setup', 'scope' => 'school', 'description' => 'Manage subject catalog and curriculum links'],
            ['key' => 'timetable.manage', 'module' => 'School Setup', 'scope' => 'school', 'description' => 'Configure timetable periods and schedule'],
            ['key' => 'roles.manage', 'module' => 'School Setup', 'scope' => 'school', 'description' => 'Manage custom roles'],
            ['key' => 'users.manage', 'module' => 'School Setup', 'scope' => 'school', 'description' => 'Manage user accounts'],

            // Students
            ['key' => 'students.view', 'module' => 'Students', 'scope' => 'school', 'description' => 'View student roster'],
            ['key' => 'students.create', 'module' => 'Students', 'scope' => 'school', 'description' => 'Admit new students'],
            ['key' => 'students.edit', 'module' => 'Students', 'scope' => 'school', 'description' => 'Edit student details'],
            ['key' => 'students.view_sensitive', 'module' => 'Students', 'scope' => 'school', 'description' => 'View sensitive contact details'],
            ['key' => 'students.verify', 'module' => 'Students', 'scope' => 'school', 'description' => 'Verify student admission documentation'],
            ['key' => 'students.promote', 'module' => 'Students', 'scope' => 'school', 'description' => 'Promote students to next class'],
            ['key' => 'students.transfer', 'module' => 'Students', 'scope' => 'school', 'description' => 'Manage student transfers'],
            ['key' => 'students.import', 'module' => 'Students', 'scope' => 'school', 'description' => 'Bulk import students'],
            ['key' => 'students.export', 'module' => 'Students', 'scope' => 'school', 'description' => 'Export student lists'],

            // Attendance
            ['key' => 'attendance.view', 'module' => 'Attendance', 'scope' => 'school', 'description' => 'View attendance records'],
            ['key' => 'attendance.mark', 'module' => 'Attendance', 'scope' => 'class', 'description' => 'Mark attendance'],
            ['key' => 'attendance.correct', 'module' => 'Attendance', 'scope' => 'school', 'description' => 'Correct locked attendance'],
            ['key' => 'attendance.report', 'module' => 'Attendance', 'scope' => 'school', 'description' => 'Generate attendance reports'],
            ['key' => 'leave.approve', 'module' => 'Attendance', 'scope' => 'school', 'description' => 'Approve leave requests'],

            // Exams & marks
            ['key' => 'exams.manage', 'module' => 'Exams and Marks', 'scope' => 'school', 'description' => 'Manage exams and grading scales'],
            ['key' => 'marks.enter', 'module' => 'Exams and Marks', 'scope' => 'subject', 'description' => 'Enter examination marks'],
            ['key' => 'marks.review', 'module' => 'Exams and Marks', 'scope' => 'class', 'description' => 'Review teacher marks'],
            ['key' => 'marks.approve', 'module' => 'Exams and Marks', 'scope' => 'school', 'description' => 'Approve marks'],
            ['key' => 'marks.amend', 'module' => 'Exams and Marks', 'scope' => 'school', 'description' => 'Amend approved marks'],
            ['key' => 'reports.generate', 'module' => 'Exams and Marks', 'scope' => 'school', 'description' => 'Generate report cards'],
            ['key' => 'reports.publish', 'module' => 'Exams and Marks', 'scope' => 'school', 'description' => 'Publish report cards'],

            // Homework
            ['key' => 'homework.create', 'module' => 'Homework', 'scope' => 'subject', 'description' => 'Create homework'],
            ['key' => 'homework.publish', 'module' => 'Homework', 'scope' => 'subject', 'description' => 'Publish homework'],
            ['key' => 'homework.review', 'module' => 'Homework', 'scope' => 'subject', 'description' => 'Review homework submissions'],
            ['key' => 'homework.view_all', 'module' => 'Homework', 'scope' => 'school', 'description' => 'View all school homework'],

            // Welfare
            ['key' => 'behaviour.record', 'module' => 'Welfare', 'scope' => 'school', 'description' => 'Record behavior incidents'],
            ['key' => 'behaviour.view', 'module' => 'Welfare', 'scope' => 'school', 'description' => 'View behavior incidents'],
            ['key' => 'behaviour.review', 'module' => 'Welfare', 'scope' => 'school', 'description' => 'Review incidents and follow-ups'],
            ['key' => 'behaviour.share_guardian', 'module' => 'Welfare', 'scope' => 'school', 'description' => 'Share incidents with parents'],
            ['key' => 'counselling.view_restricted', 'module' => 'Welfare', 'scope' => 'restricted', 'description' => 'View restricted counselling records'],

            // Communication
            ['key' => 'announcements.create', 'module' => 'Communication', 'scope' => 'school', 'description' => 'Create announcements'],
            ['key' => 'announcements.publish', 'module' => 'Communication', 'scope' => 'school', 'description' => 'Publish announcements'],
            ['key' => 'messages.send', 'module' => 'Communication', 'scope' => 'school', 'description' => 'Send messages'],
            ['key' => 'notifications.manage', 'module' => 'Communication', 'scope' => 'school', 'description' => 'Manage notification settings'],

            // System
            ['key' => 'audit.view_school', 'module' => 'System', 'scope' => 'school', 'description' => 'View school audit logs'],
            ['key' => 'imports.view', 'module' => 'System', 'scope' => 'school', 'description' => 'View data imports'],
            ['key' => 'settings.manage', 'module' => 'System', 'scope' => 'school', 'description' => 'Manage school settings'],
            ['key' => 'sessions.revoke', 'module' => 'System', 'scope' => 'school', 'description' => 'Revoke active sessions'],
        ];

        foreach ($permissions as $p) {
            Permission::firstOrCreate(['key' => $p['key']], $p);
        }

        // 2. Seed System Roles
        $systemRoles = [
            ['name' => 'Super Admin', 'scope' => 'platform', 'is_system' => true, 'description' => 'Platform owner'],
            ['name' => 'Operations Staff', 'scope' => 'platform', 'is_system' => true, 'description' => 'Cross-school verification and ops staff'],
            ['name' => 'School Admin', 'scope' => 'school', 'is_system' => true, 'description' => 'School administrator'],
            ['name' => 'Class Admin', 'scope' => 'class', 'is_system' => true, 'description' => 'Class teacher and admin'],
            ['name' => 'Teacher', 'scope' => 'subject', 'is_system' => true, 'description' => 'Subject teacher'],
            ['name' => 'Student', 'scope' => 'student', 'is_system' => true, 'description' => 'Enrolled student'],
            ['name' => 'Parent', 'scope' => 'student', 'is_system' => true, 'description' => 'Parent or guardian'],
        ];

        foreach ($systemRoles as $r) {
            Role::firstOrCreate(['school_id' => null, 'name' => $r['name']], $r);
        }

        // 3. Map Default Role Permissions
        $superAdminRole = Role::whereNull('school_id')->where('name', 'Super Admin')->first();
        $superAdminRole->permissions()->sync(Permission::whereIn('module', ['Platform', 'System'])->pluck('id'));

        $opsStaffRole = Role::whereNull('school_id')->where('name', 'Operations Staff')->first();
        $opsStaffRole->permissions()->sync(
            Permission::whereIn('key', [
                'schools.view_all', 'students.view', 'students.create', 'students.edit',
                'students.view_sensitive', 'students.verify', 'students.import', 'students.export',
                'marks.review', 'imports.view', 'audit.view_school'
            ])->pluck('id')
        );

        $schoolAdminRole = Role::whereNull('school_id')->where('name', 'School Admin')->first();
        $schoolAdminRole->permissions()->sync(
            Permission::whereNotIn('module', ['Platform'])->pluck('id')
        );

        // 4. Seed First Super Admin Strictly from .env
        $adminEmail = env('SUPER_ADMIN_EMAIL', 'superadmin@rithikgroup.com');
        $adminPass = env('SUPER_ADMIN_PASSWORD', 'SuperAdminSecret2026!');
        $adminName = env('SUPER_ADMIN_NAME', 'Super Administrator');

        $superAdmin = User::firstOrCreate(
            ['email' => Str::lower($adminEmail)],
            [
                'public_uuid' => (string) Str::uuid(),
                'full_name' => $adminName,
                'password_hash' => Hash::make($adminPass),
                'user_type' => 'platform',
                'status' => 'active',
                'email_verified_at' => now(),
                'mfa_enabled' => false,
            ]
        );

        UserSchoolMembership::firstOrCreate([
            'user_id' => $superAdmin->id,
            'school_id' => 1, // Dummy platform anchor or 0
            'role_id' => $superAdminRole->id,
        ], [
            'status' => 'active',
        ]);
    }
}
