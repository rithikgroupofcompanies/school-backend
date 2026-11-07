<?php

namespace App\Http\Controllers\Api\V1\Ops;

use App\Http\Controllers\Controller;
use App\Models\PlatformStaffAssignment;
use App\Models\School;
use App\Models\SchoolDocument;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OpsVerificationController extends Controller
{
    public function assignedSchools(Request $request): JsonResponse
    {
        $user = $request->user();

        $assignedSchoolIds = PlatformStaffAssignment::where('staff_user_id', $user->id)
            ->where('status', 'active')
            ->where('start_date', '<=', now()->toDateString())
            ->where(function ($q) {
                $q->whereNull('end_date')->orWhere('end_date', '>=', now()->toDateString());
            })
            ->pluck('school_id');

        $schools = School::whereIn('id', $assignedSchoolIds)
            ->withCount(['documents as pending_documents_count' => function ($q) {
                $q->where('verification_status', 'pending');
            }])
            ->get();

        return response()->json($schools);
    }

    public function verificationQueue(Request $request): JsonResponse
    {
        $user = $request->user();

        $assignedSchoolIds = PlatformStaffAssignment::where('staff_user_id', $user->id)
            ->where('status', 'active')
            ->pluck('school_id');

        $pendingDocuments = SchoolDocument::whereIn('school_id', $assignedSchoolIds)
            ->where('verification_status', 'pending')
            ->with('school:id,name,school_code')
            ->orderBy('created_at')
            ->paginate(20);

        return response()->json($pendingDocuments);
    }

    public function reviewDocument(Request $request, SchoolDocument $document): JsonResponse
    {
        $request->validate([
            'outcome' => ['required', 'in:verified,needs_correction,rejected'],
            'review_note' => ['required_unless:outcome,verified', 'nullable', 'string', 'max:500'],
        ]);

        $user = $request->user();

        // Enforce assignment check
        $hasAssignment = PlatformStaffAssignment::where('staff_user_id', $user->id)
            ->where('school_id', $document->school_id)
            ->where('status', 'active')
            ->exists();

        if (!$hasAssignment && !$user->isSuperAdmin()) {
            return response()->json([
                'message' => 'Unauthorized: You are not assigned to verify documents for this school.'
            ], 403);
        }

        $document->update([
            'verification_status' => $request->input('outcome'),
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
            'review_note' => $request->input('review_note'),
        ]);

        AuditLogService::log(
            action: 'school_document.reviewed',
            entity: $document,
            newValues: ['status' => $request->input('outcome'), 'note' => $request->input('review_note')],
            schoolId: $document->school_id
        );

        return response()->json([
            'message' => 'Document review recorded successfully.',
            'document' => $document,
        ]);
    }
}
