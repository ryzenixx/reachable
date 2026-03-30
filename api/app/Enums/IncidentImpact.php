<?php

declare(strict_types=1);

namespace App\Enums;

enum IncidentImpact: string
{
    case None = 'none';
    case Minor = 'minor';
    case Major = 'major';
    case Critical = 'critical';
}
