<?php

declare(strict_types=1);

namespace App\Enums;

enum IncidentStatus: string
{
    case Investigating = 'investigating';
    case Identified = 'identified';
    case Monitoring = 'monitoring';
    case Resolved = 'resolved';
}
