<?php

$defaultAllowedOrigins = implode(',', array_values(array_filter([
    (string) env('FRONTEND_URL', 'http://localhost:3000'),
    'http://localhost:3000',
    'http://127.0.0.1:3000',
], static fn (string $origin): bool => trim($origin) !== '')));

$allowedOrigins = array_values(array_filter(
    array_map(
        static fn (string $origin): string => trim($origin),
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', $defaultAllowedOrigins))
    ),
    static fn (string $origin): bool => $origin !== ''
));

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'broadcasting/auth', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
