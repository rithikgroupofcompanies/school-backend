<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\PlatformStaffAssignment;
use App\Models\School;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class SuperAdminDashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $totalSchools = School::count();
        $activeSchools = School::where('account_status', 'active')->count();
        $pendingApprovals = School::where('onboarding_status', 'submitted')
            ->orWhere('onboarding_status', 'verifying')
            ->count();
        
        $totalPlatformStaff = User::where('user_type', 'platform')
            ->where('status', 'active')
            ->count();

        $recentSchools = School::orderByDesc('created_at')->take(5)->get();
        $recentAuditLogs = AuditLog::with('actor:id,full_name,email')
            ->orderByDesc('created_at')
            ->take(10)
            ->get();

        return response()->json([
            'metrics' => [
                'total_schools' => $totalSchools,
                'active_schools' => $activeSchools,
                'pending_approvals' => $pendingApprovals,
                'total_platform_staff' => $totalPlatformStaff,
            ],
            'recent_schools' => $recentSchools,
            'recent_audit_logs' => $recentAuditLogs,
        ]);
    }
}
