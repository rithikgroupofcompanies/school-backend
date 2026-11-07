<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Request;

class AuditLogService
{
    public static function log(
        string $action,
        string|Model $entity,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?string $reason = null,
        ?int $schoolId = null
    ): AuditLog {
        $user = Request::user();
        
        $entityType = is_string($entity) ? $entity : get_class($entity);
        $entityId = is_string($entity) ? null : $entity->getKey();

        return AuditLog::create([
            'school_id' => $schoolId ?? CurrentSchool::id(),
            'actor_user_id' => $user?->id,
            'actor_role' => $user?->active_role_name ?? null,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'reason' => $reason,
            'ip' => Request::ip() ?? '127.0.0.1',
            'user_agent' => Request::userAgent(),
            'created_at' => now(),
        ]);
    }
}
