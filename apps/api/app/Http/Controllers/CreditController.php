<?php

namespace App\Http\Controllers;

use App\Http\Resources\CreditTransactionResource;
use Illuminate\Http\Request;

class CreditController extends Controller
{
    /** The member's own ledger rows, newest first. */
    public function transactions(Request $request)
    {
        $rows = $request->user()->creditTransactions()
            ->with(['counterparty:id,name', 'helpRequest.skill:id,title'])
            ->latestFirst()
            ->limit(200)
            ->get();

        return CreditTransactionResource::collection($rows);
    }
}
