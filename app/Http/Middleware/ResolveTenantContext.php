<?php

namespace App\Http\Middleware;

use App\Models\School;
use App\Models\UserSchoolMembership;
use App\Models\PlatformStaffAssignment;
use App\Support\Tenancy\CurrentSchool;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenantContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return $next($request);
        }

        // 1. Resolve school from route parameter if present: /schools/{school}/...
        $routeSchool = $request->route('school');
        $schoolId = null;

        if ($routeSchool instanceof School) {
            $schoolId = $routeSchool->id;
        } elseif (is_numeric($routeSchool)) {
            $schoolId = (int) $routeSchool;
        } elseif ($request->header('X-School-ID')) {
            $schoolId = (int) $request->header('X-School-ID');
        } elseif ($request->session()->has('active_school_id')) {
            $schoolId = (int) $request->session()->get('active_school_id');
        }

        if ($schoolId) {
            $school = School::find($schoolId);

            if (!$school) {
                return response()->json([
                    'message' => 'The requested school tenant does not exist.'
                ], 404);
            }

            // Check access rights
            if ($user->isSuperAdmin()) {
                // Platform Super Admin has access
                CurrentSchool::set($school);
            } elseif ($user->isOpsStaff()) {
                // Ops staff must have an active assignment to this school
                $hasAssignment = PlatformStaffAssignment::where('staff_user_id', $user->id)
                    ->where('school_id', $school->id)
                    ->where('status', 'active')
                    ->where('start_date', '<=', now()->toDateString())
                    ->where(function ($q) {
                        $q->whereNull('end_date')->orWhere('end_date', '>=', now()->toDateString());
                    })
                    ->exists();

                if (!$hasAssignment) {
                    return response()->json([
                        'message' => 'Unauthorized: You are not assigned to this school.'
                    ], 403);
                }

                CurrentSchool::set($school);
            } else {
                // School users must have an active membership
                $membership = UserSchoolMembership::where('user_id', $user->id)
                    ->where('school_id', $school->id)
                    ->where('status', 'active')
                    ->first();

                if (!$membership) {
                    return response()->json([
                        'message' => 'Forbidden: You do not have an active membership with this school.'
                    ], 403);
                }

                // Attach active membership and role to request
                $request->attributes->set('membership', $membership);
                $request->attributes->set('role', $membership->role);

                CurrentSchool::set($school);
            }
        }

        return $next($request);
    }
}
