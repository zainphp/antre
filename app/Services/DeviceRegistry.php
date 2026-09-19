<?php

namespace App\Services;

use App\Enums\DeviceStatus;
use App\Models\Device;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Cookie as SymfonyCookie;

final class DeviceRegistry
{
    public const string COOKIE = 'antre_device';

    public function resolve(Request $request): ?Device
    {
        $value = $request->cookie(self::COOKIE);
        if (! is_string($value)) {
            return null;
        }

        [$deviceId, $credential] = array_pad(explode('.', $value, 2), 2, null);
        if (! is_string($deviceId) || ! is_string($credential)) {
            return null;
        }

        $device = Device::find($deviceId);
        if (! $device || ! hash_equals($device->credential_hash, hash('sha256', $credential))) {
            return null;
        }

        return $device;
    }

    /**
     * @return array{device: Device, cookie: SymfonyCookie|null}
     */
    public function bootstrap(Request $request): array
    {
        $device = $this->resolve($request);
        if ($device) {
            $this->touch($device);

            return ['device' => $device, 'cookie' => null];
        }

        $credential = Str::random(64);
        $device = Device::create([
            'name' => 'Perangkat KBS-'.strtoupper(Str::substr(Str::uuid()->toString(), 0, 4)),
            'status' => DeviceStatus::Unregistered,
            'credential_hash' => hash('sha256', $credential),
            'last_seen_at' => now(),
        ]);

        return [
            'device' => $device,
            'cookie' => Cookie::make(
                self::COOKIE,
                $device->getKey().'.'.$credential,
                60 * 24 * 365 * 5,
                '/',
                null,
                app()->isProduction(),
                true,
                false,
                'lax',
            ),
        ];
    }

    public function touch(Device $device): void
    {
        $device->forceFill(['last_seen_at' => now()])->saveQuietly();
    }
}
