<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Saves a picture sent as a data URL (the browser resizes it first) on the public disk.
 * The bytes are checked to really be an image of an allowed type and a sensible size.
 */
class ImageStore
{
    private const MAX_BYTES = 1_500_000;

    private const TYPES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

    /** @return string path on the public disk, e.g. avatars/3f2a....jpg */
    public function storeDataUrl(string $dataUrl, string $directory, string $field = 'image'): string
    {
        if (! preg_match('#^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)$#', $dataUrl, $m)) {
            throw ValidationException::withMessages([$field => 'Upload a JPG, PNG or WebP picture.']);
        }

        $bytes = base64_decode($m[2], true);
        if ($bytes === false || $bytes === '' || strlen($bytes) > self::MAX_BYTES) {
            throw ValidationException::withMessages([$field => 'That picture is too large. Try a smaller one.']);
        }

        // Trust the file contents, not the label the browser put on it.
        $info = @getimagesizefromstring($bytes);
        if ($info === false || ! isset(self::TYPES[$info['mime']]) || $info[0] < 16 || $info[1] < 16 || $info[0] > 4000 || $info[1] > 4000) {
            throw ValidationException::withMessages([$field => 'That file is not a usable picture.']);
        }

        $path = trim($directory, '/').'/'.Str::uuid().'.'.self::TYPES[$info['mime']];
        Storage::disk('public')->put($path, $bytes);

        return $path;
    }

    public function delete(?string $path): void
    {
        if ($path) {
            Storage::disk('public')->delete($path);
        }
    }
}
