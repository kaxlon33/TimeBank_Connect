<?php

namespace App\Enums;

enum ReviewStatus: string
{
    case Visible = 'visible';
    case Removed = 'removed';
}
