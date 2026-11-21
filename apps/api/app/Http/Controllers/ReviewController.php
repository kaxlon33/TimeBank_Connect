<?php

namespace App\Http\Controllers;

use App\Http\Resources\ReviewResource;
use App\Models\HelpRequest;
use App\Services\ReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function store(Request $request, int $id, ReviewService $reviews): JsonResponse
    {
        $data = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        $helpRequest = HelpRequest::query()->involving($request->user()->id)->with(['requester', 'provider'])->findOrFail($id);

        $review = $reviews->submit($helpRequest, $request->user(), (int) $data['rating'], $data['comment'] ?? null);
        $review->load(['reviewer:id,name', 'reviewee:id,name']);

        return (new ReviewResource($review))->response()->setStatusCode(201);
    }
}
