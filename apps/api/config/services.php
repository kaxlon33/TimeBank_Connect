<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    | Third-party REST APIs. Only these two fixed hosts are ever called; member text is only
    | ever sent as a query value, never used as part of a URL.
    */

    // OpenStreetMap Nominatim: turns an area name into coordinates. Usage policy: 1 request a second,
    // a real User-Agent, cache results. Keep the User-Agent generic (no personal details).
    'nominatim' => [
        'enabled' => env('NOMINATIM_ENABLED', true),
        'base_url' => env('NOMINATIM_URL', 'https://nominatim.openstreetmap.org'),
        'user_agent' => env('NOMINATIM_USER_AGENT', 'TimeBankConnect/1.0 (student community project)'),
        'timeout' => 5,
        'cache_seconds' => 86400,
        'min_interval_ms' => (int) env('NOMINATIM_MIN_INTERVAL_MS', 1000),
    ],

    // REST Countries: country names, flags and calling codes for the sign-up form.
    'restcountries' => [
        'base_url' => env('RESTCOUNTRIES_URL', 'https://restcountries.com/v3.1'),
        'timeout' => 15,
    ],

];
