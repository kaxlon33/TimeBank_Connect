<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\CreditTransaction */
class CreditTransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'amount' => (float) $this->amount,
            'balance_after' => (float) $this->balance_after,
            'counterparty' => $this->counterparty ? ['id' => $this->counterparty->id, 'name' => $this->counterparty->name] : null,
            'help_request_id' => $this->help_request_id,
            'skill_title' => $this->helpRequest?->skill?->title,
            'note' => $this->note,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
