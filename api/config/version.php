<?php

declare(strict_types=1);

return [
    'current' => env('APP_VERSION', ''),

    'update_check' => [
        'enabled' => (bool) env('UPDATE_CHECK_ENABLED', true),
        'repository' => env('UPDATE_CHECK_REPOSITORY', 'reachableapps/reachable'),
        'cache_ttl_seconds' => (int) env('UPDATE_CHECK_CACHE_TTL_SECONDS', 60),
        'timeout_seconds' => (int) env('UPDATE_CHECK_TIMEOUT_SECONDS', 5),
    ],
];
