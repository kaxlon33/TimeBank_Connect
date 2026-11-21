<?php

namespace App\Support;

/** Small geography helpers. */
class Geo
{
    /** Great-circle distance in kilometres (Haversine). */
    public static function distanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $r = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $r * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /**
     * A stable, small offset (about 400 m at most) for one member, so pins in the same
     * area do not stack and nobody's exact home is revealed. Same member, same offset.
     *
     * @return array{0: float, 1: float} [latitude offset, longitude offset] in degrees
     */
    public static function privacyOffset(int $userId): array
    {
        $seed = crc32('timebank-pin-'.$userId);

        return [
            (($seed & 0xFFFF) / 0xFFFF - 0.5) * 0.008,
            ((($seed >> 16) & 0xFFFF) / 0xFFFF - 0.5) * 0.008,
        ];
    }
}
