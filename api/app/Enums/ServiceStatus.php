<?php

declare(strict_types=1);

namespace App\Enums;

enum ServiceStatus: string
{
    case Operational = 'operational';
    case Degraded = 'degraded';
    case PartialOutage = 'partial_outage';
    case MajorOutage = 'major_outage';
    case Maintenance = 'maintenance';

    public function severity(): int
    {
        return match ($this) {
            self::Operational => 0,
            self::Maintenance => 1,
            self::Degraded => 2,
            self::PartialOutage => 3,
            self::MajorOutage => 4,
        };
    }
}
