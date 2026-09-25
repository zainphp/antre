<?php

declare(strict_types=1);

namespace App\Data\Frontend;

use Spatie\LaravelData\Data;

final class FooterLinkData extends Data
{
    public function __construct(
        public string $label,
        public string $url,
    ) {}
}
