<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * A few sample notifications for the demo member (Tom Fletcher), so the notifications
 * page has something to show. Only runs when nobody has any notifications yet.
 */
class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        if (DatabaseNotification::query()->exists()) {
            return;
        }

        $tom = User::query()->where('name', 'Tom Fletcher')->first();
        if (! $tom) {
            return;
        }

        // [type, title, body, link, read, hours ago]
        $rows = [
            ['request_received', 'New request from Aye Chan', 'Python and spreadsheet tutoring, 1 hour', '/requests?tab=received', false, 3],
            ['request_marked_done', 'Daniel marked your session as done', 'Flat-pack furniture assembly. Confirm to send 1 credit.', '/requests?tab=sent', false, 35],
            ['request_accepted', 'You accepted Sophie’s request', 'Python and spreadsheet tutoring, 1.5 hours', '/requests?tab=received', true, 48],
            ['review_received', 'Hassan left you a 4 star review', '“Well organised, boxes were all labelled.”', '/profile', true, 216],
            ['request_completed', 'Session completed with Hassan', '2.5 credits sent for Help moving boxes.', '/credits', true, 240],
            ['badge_awarded', 'You earned the First Exchange badge', 'Thanks for helping a neighbour for the first time.', '/profile', true, 600],
        ];

        foreach ($rows as [$type, $title, $body, $link, $read, $hoursAgo]) {
            $at = now()->subHours($hoursAgo);
            $n = new DatabaseNotification;
            $n->forceFill([
                'id' => (string) Str::uuid(),
                'type' => 'App\\Notifications\\'.Str::studly($type),
                'notifiable_type' => User::class,
                'notifiable_id' => $tom->id,
                'data' => compact('type', 'title', 'body', 'link'),
                'read_at' => $read ? $at->copy()->addHour() : null,
                'created_at' => $at,
                'updated_at' => $at,
            ])->save();
        }
    }
}
