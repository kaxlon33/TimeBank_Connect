<?php

namespace App\Http\Controllers;

use App\Http\Resources\NotificationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        return NotificationResource::collection(
            $request->user()->notifications()->latest()->limit(100)->get(),
        );
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $request->user()->notifications()->whereKey($id)->firstOrFail()->markAsRead();

        return response()->json(['message' => 'Marked as read']);
    }

    public function markUnread(Request $request, string $id): JsonResponse
    {
        $request->user()->notifications()->whereKey($id)->firstOrFail()->markAsUnread();

        return response()->json(['message' => 'Marked as unread']);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['message' => 'All marked as read']);
    }

    public function markAllUnread(Request $request): JsonResponse
    {
        $request->user()->notifications()->whereNotNull('read_at')->update(['read_at' => null]);

        return response()->json(['message' => 'All marked as unread']);
    }
}
