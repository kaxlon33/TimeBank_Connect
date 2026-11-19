<?php

namespace App\Enums;

enum SkillStatus: string
{
    case Active = 'active';
    case Hidden = 'hidden';   // hidden by its owner
    case Removed = 'removed'; // removed by an admin (moderation)
}
