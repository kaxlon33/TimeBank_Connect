<?php

/*
|--------------------------------------------------------------------------
| TimeBank Connect business rules
|--------------------------------------------------------------------------
| One hour of help is worth one credit. Sessions are booked in half-hour steps.
*/

return [
    'credits_per_hour' => 1,

    'request' => [
        'min_hours' => 0.5,
        'max_hours' => 4,
        'hours_step' => 0.5,
    ],

    // Badge thresholds (design 10.3). Awarded once, never taken away.
    'badges' => [
        'helping_hand_sessions' => 5,
        'community_builder_sessions' => 10,
        'top_rated_reviews' => 5,
        'top_rated_average' => 4.5,
        'reliable_accepted' => 5,
        'reliable_rate' => 0.9,
        'trusted_trust' => 80,
        'trusted_sessions' => 5,
    ],

    // Trust score (design 10.2): 0.5 rating + 0.3 reliability + 0.2 experience.
    'trust' => [
        'weights' => ['rating' => 0.5, 'reliability' => 0.3, 'experience' => 0.2],
        'prior_stars' => 3.5,
        'prior_weight' => 3,
        'experience_cap' => 20,
    ],
];
