<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Schools (Master Tenant)
        Schema::create('schools', function (Blueprint $table) {
            $table->id();
            $table->string('school_code', 20)->unique();
            $table->string('name', 200);
            $table->string('short_name', 60);
            $table->string('board', 40);
            $table->enum('school_type', ['government', 'aided', 'private', 'international', 'other'])->default('private');
            $table->string('medium', 100);
            $table->string('registration_no', 60)->nullable();
            $table->string('classes_from', 10)->default('1');
            $table->string('classes_to', 10)->default('12');
            $table->string('address_line1', 255);
            $table->string('address_line2', 255)->nullable();
            $table->string('city', 100);
            $table->string('district', 100);
            $table->string('state', 100);
            $table->string('pincode', 10);
            $table->string('official_email', 150);
            $table->string('phone', 25);
            $table->string('website', 200)->nullable();
            $table->string('principal_name', 150)->nullable();
            $table->string('principal_phone', 25)->nullable();
            $table->unsignedInteger('campuses')->default(1);
            $table->unsignedBigInteger('logo_file_id')->nullable();
            $table->string('timezone', 50)->default('Asia/Kolkata');
            $table->enum('onboarding_status', ['draft', 'submitted', 'verifying', 'corrections_required', 'approved', 'rejected'])->default('draft');
            $table->enum('account_status', ['pending', 'active', 'suspended', 'archived'])->default('pending');
            $table->string('status_reason', 500)->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index(['account_status', 'onboarding_status']);
        });

        // 2. School Settings
        Schema::create('school_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained('schools')->cascadeOnDelete();
            $table->string('key', 100);
            $table->json('value');
            $table->timestamps();

            $table->unique(['school_id', 'key']);
        });

        // 3. School Documents
        Schema::create('school_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained('schools')->cascadeOnDelete();
            $table->string('doc_type', 60);
            $table->unsignedBigInteger('file_id');
            $table->date('issue_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->enum('verification_status', ['pending', 'verified', 'needs_correction', 'rejected'])->default('pending');
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->timestamps();

            $table->index(['school_id', 'verification_status']);
        });

        // 4. School Subscriptions
        Schema::create('school_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained('schools')->cascadeOnDelete();
            $table->string('plan_code', 50)->default('standard');
            $table->date('valid_from');
            $table->date('valid_to');
            $table->unsignedInteger('student_limit')->default(500);
            $table->unsignedInteger('user_limit')->default(50);
            $table->enum('status', ['active', 'expired', 'cancelled', 'grace'])->default('active');
            $table->timestamps();

            $table->index(['school_id', 'status']);
        });

        // 5. Users
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->uuid('public_uuid')->unique();
            $table->string('email', 150)->unique();
            $table->string('mobile', 25)->nullable();
            $table->string('password_hash');
            $table->string('full_name', 150);
            $table->enum('user_type', ['platform', 'school'])->default('school');
            $table->enum('status', ['pending', 'active', 'suspended', 'inactive'])->default('pending');
            $table->timestamp('email_verified_at')->nullable();
            $table->text('mfa_secret')->nullable();
            $table->boolean('mfa_enabled')->default(false);
            $table->unsignedInteger('failed_attempts')->default(0);
            $table->timestamp('locked_until')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();

            $table->index(['user_type', 'status']);
        });

        // 6. Roles
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->nullable()->constrained('schools')->cascadeOnDelete();
            $table->string('name', 60);
            $table->enum('scope', ['platform', 'school', 'class', 'subject', 'student'])->default('school');
            $table->boolean('is_system')->default(false);
            $table->string('description', 255)->nullable();
            $table->timestamps();

            $table->unique(['school_id', 'name']);
        });

        // 7. Permissions
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->string('module', 50);
            $table->string('scope', 50)->default('school');
            $table->string('description', 255);
            $table->timestamp('created_at')->useCurrent();

            $table->index('module');
        });

        // 8. Role Permissions
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
            $table->primary(['role_id', 'permission_id']);
        });

        // 9. User School Memberships
        Schema::create('user_school_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('school_id')->constrained('schools')->cascadeOnDelete();
            $table->foreignId('role_id')->constrained('roles')->restrictOnDelete();
            $table->enum('status', ['active', 'suspended', 'ended'])->default('active');
            $table->date('valid_from')->nullable();
            $table->date('valid_to')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'school_id', 'role_id'], 'uq_membership');
            $table->index(['school_id', 'role_id']);
        });

        // 10. Platform Staff Profiles
        Schema::create('platform_staff_profiles', function (Blueprint $table) {
            $table->foreignId('user_id')->primary()->constrained('users')->cascadeOnDelete();
            $table->string('employee_id', 50)->unique();
            $table->string('department', 100);
            $table->string('designation', 100);
            $table->date('joining_date');
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
        });

        // 11. Platform Staff Assignments
        Schema::create('platform_staff_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('school_id')->constrained('schools')->cascadeOnDelete();
            $table->enum('assignment_type', ['verification', 'data_entry', 'monitoring', 'all'])->default('verification');
            $table->json('permitted_operations');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->enum('status', ['active', 'revoked', 'expired'])->default('active');
            $table->unsignedBigInteger('assigned_by');
            $table->timestamps();

            $table->index(['staff_user_id', 'status']);
            $table->index(['school_id', 'status']);
        });

        // 12. Login Sessions
        Schema::create('login_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('school_id')->nullable();
            $table->string('token_hash', 64);
            $table->string('ip', 45);
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('last_seen_at')->useCurrent();
            $table->timestamp('expires_at');
            $table->timestamp('revoked_at')->nullable();

            $table->index(['user_id', 'revoked_at']);
            $table->index('token_hash');
        });

        // 13. Invitations
        Schema::create('invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('purpose', ['activation', 'reset']);
            $table->string('token_hash', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('user_id');
        });

        // 14. File Metadata
        Schema::create('file_metadata', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('school_id')->nullable();
            $table->string('owner_type', 100);
            $table->unsignedBigInteger('owner_id');
            $table->string('storage_path', 255);
            $table->string('original_name', 255);
            $table->string('mime', 100);
            $table->unsignedBigInteger('size');
            $table->char('sha256', 64);
            $table->enum('visibility', ['private', 'school_restricted', 'public_authenticated'])->default('private');
            $table->unsignedBigInteger('uploaded_by');
            $table->enum('scan_status', ['pending', 'clean', 'infected'])->default('clean');
            $table->timestamp('created_at')->useCurrent();

            $table->index('school_id');
            $table->index(['owner_type', 'owner_id']);
        });

        // 15. Audit Logs
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('school_id')->nullable();
            $table->unsignedBigInteger('actor_user_id')->nullable();
            $table->string('actor_role', 60)->nullable();
            $table->string('action', 100);
            $table->string('entity_type', 100);
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('reason', 500)->nullable();
            $table->string('ip', 45);
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['school_id', 'created_at']);
            $table->index(['entity_type', 'entity_id']);
            $table->index('actor_user_id');
        });

        // 16. Security Events
        Schema::create('security_events', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('event_type', 80);
            $table->string('ip', 45);
            $table->json('details')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('user_id');
            $table->index(['event_type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('security_events');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('file_metadata');
        Schema::dropIfExists('invitations');
        Schema::dropIfExists('login_sessions');
        Schema::dropIfExists('platform_staff_assignments');
        Schema::dropIfExists('platform_staff_profiles');
        Schema::dropIfExists('user_school_memberships');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('users');
        Schema::dropIfExists('school_subscriptions');
        Schema::dropIfExists('school_documents');
        Schema::dropIfExists('school_settings');
        Schema::dropIfExists('schools');
    }
};
