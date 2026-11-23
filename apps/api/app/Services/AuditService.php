<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;

/** Every admin action leaves a row in audit_logs: who did what to which thing, and why. */
class AuditService
{
    /** @param array<string,mixed> $extra */
    public function record(User $actor, string $action, string $targetType, ?int $targetId, string $label, ?string $reason = null, array $extra = []): AuditLog
    {
        $log = new AuditLog;
        $log->forceFill([
            'actor_id' => $actor->id,
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'meta' => ['label' => $label, 'reason' => $reason] + $extra,
        ])->save();

        return $log;
    }
}
