<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequirePermission
{
    public function handle(Request $request, Closure $next, string $permissionKey): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Super Admin bypasses with full audit
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        // Check if ops staff has permitted operation
        if ($user->isOpsStaff()) {
            $assignment = $request->attributes->get('assignment');
            if ($assignment && in_array($permissionKey, $assignment->permitted_operations ?? [])) {
                return $next($request);
            }
        }

        // Check membership role permissions
        $role = $request->attributes->get('role');
        if (!$role) {
            $membership = $user->memberships()->where('status', 'active')->first();
            $role = $membership?->role;
        }

        if ($role && $role->hasPermission($permissionKey)) {
            return $next($request);
        }

        return response()->json([
            'message' => "Access denied: Missing required permission [{$permissionKey}]."
        ], 403);
    }
}
