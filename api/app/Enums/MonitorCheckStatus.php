<?php

declare(strict_types=1);

namespace App\Enums;

enum MonitorCheckStatus: string
{
    case Up = 'up';
    case Down = 'down';
    case Degraded = 'degraded';
}
