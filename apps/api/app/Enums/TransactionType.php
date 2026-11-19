<?php

namespace App\Enums;

enum TransactionType: string
{
    case StarterGrant = 'starter_grant';
    case SessionDebit = 'session_debit';
    case SessionCredit = 'session_credit';
    case AdminAdjustment = 'admin_adjustment';
}
