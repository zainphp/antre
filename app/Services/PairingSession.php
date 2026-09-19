<?php

declare(strict_types=1);

namespace App\Services;

use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Cache;

final class PairingSession
{
    public const int DURATION_SECONDS = 60;

    private const string CACHE_KEY = 'antre.pairing-session.expires-at';

    public function open(): CarbonInterface
    {
        $expiresAt = now()->addSeconds(self::DURATION_SECONDS);

        Cache::put(self::CACHE_KEY, $expiresAt->getTimestamp(), self::DURATION_SECONDS);

        return $expiresAt;
    }

    public function close(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    public function isOpen(): bool
    {
        return $this->expiresAt() instanceof CarbonInterface;
    }

    /** @return array{open: bool, expires_at: string|null, remaining_seconds: int} */
    public function state(): array
    {
        $expiresAt = $this->expiresAt();

        return [
            'open' => $expiresAt instanceof CarbonInterface,
            'expires_at' => $expiresAt?->toISOString(),
            'remaining_seconds' => $expiresAt
                ? max(0, $expiresAt->getTimestamp() - now()->getTimestamp())
                : 0,
        ];
    }

    private function expiresAt(): ?CarbonInterface
    {
        $value = Cache::get(self::CACHE_KEY);
        $timestamp = match (true) {
            is_int($value) => $value,
            is_string($value) && ctype_digit($value) => (int) $value,
            default => null,
        };

        if ($timestamp === null || $timestamp <= now()->getTimestamp()) {
            if ($timestamp !== null) {
                Cache::forget(self::CACHE_KEY);
            }

            return null;
        }

        return now()->setTimestamp($timestamp);
    }
}
