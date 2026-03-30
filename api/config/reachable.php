<?php

declare(strict_types=1);

return [
    'monitoring' => [
        /*
        |--------------------------------------------------------------------------
        | Allow Private Targets
        |--------------------------------------------------------------------------
        |
        | When disabled, monitor checks will reject localhost, private, link-local,
        | and reserved addresses. Enable only if you intentionally monitor private
        | internal services in a trusted environment.
        |
        */
        'allow_private_targets' => env('MONITOR_ALLOW_PRIVATE_TARGETS', false),
    ],
];

