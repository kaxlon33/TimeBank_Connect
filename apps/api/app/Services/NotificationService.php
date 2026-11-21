<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Str;

/** Creates the in-app notifications members see on the notifications page. */
class NotificationService
{
    public function send(User $to, string $type, string $title, string $body, string $link): DatabaseNotification
    {
        $notification = new DatabaseNotification;
        $notification->forceFill([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\'.Str::studly($type),
            'notifiable_type' => User::class,
            'notifiable_id' => $to->id,
            'data' => compact('type', 'title', 'body', 'link'),
        ])->save();

        return $notification;
    }
}
