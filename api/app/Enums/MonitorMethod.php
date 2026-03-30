<?php

declare(strict_types=1);

namespace App\Enums;

enum MonitorMethod: string
{
    case GET = 'GET';
    case POST = 'POST';
    case HEAD = 'HEAD';
}
