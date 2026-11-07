<?php

use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Ops\OpsVerificationController;
use App\Http\Controllers\Api\V1\Platform\SchoolOnboardingController;
use App\Http\Controllers\Api\V1\Platform\SuperAdminDashboardController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - V1
| Platform: Rithik Group of Companies Multi-School ERP
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // 1. Authentication Endpoints (Public)
    Route::prefix('auth')->group(function () {
        Route::post('login', [AuthController::class, 'login']);
        Route::post('activate', [AuthController::class, 'activateAccount']);

        // Authenticated Session routes
        Route::middleware('auth:sanctum')->group(function () {
            Route::get('me', [AuthController::class, 'me']);
            Route::post('logout', [AuthController::class, 'logout']);
        });
    });

    // 2. Super Admin Platform Endpoints
    Route::middleware(['auth:sanctum'])->prefix('platform')->group(function () {
        // Dashboard Stats
        Route::get('dashboard/stats', [SuperAdminDashboardController::class, 'stats']);

        // School Onboarding & Lifecycle
        Route::get('schools', [SchoolOnboardingController::class, 'index']);
        Route::post('schools', [SchoolOnboardingController::class, 'store']);
        Route::post('schools/{school}/submit', [SchoolOnboardingController::class, 'submit']);
        Route::post('schools/{school}/approve', [SchoolOnboardingController::class, 'approve']);
        Route::post('schools/{school}/suspend', [SchoolOnboardingController::class, 'suspend']);
        Route::post('schools/{school}/reactivate', [SchoolOnboardingController::class, 'reactivate']);
    });

    // 3. Platform Operations Staff Endpoints
    Route::middleware(['auth:sanctum'])->prefix('ops')->group(function () {
        Route::get('my-assigned-schools', [OpsVerificationController::class, 'assignedSchools']);
        Route::get('verification-queue', [OpsVerificationController::class, 'verificationQueue']);
        Route::post('documents/{document}/review', [OpsVerificationController::class, 'reviewDocument']);
    });

    // 4. Tenancy Scoped School Endpoints
    Route::middleware(['auth:sanctum', 'tenant.context'])->prefix('schools/{school}')->group(function () {
        // School-specific endpoints are registered here in subsequent phases
        Route::get('profile', function () {
            return response()->json(\App\Support\Tenancy\CurrentSchool::get());
        });
    });
});
