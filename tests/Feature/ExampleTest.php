<?php

declare(strict_types=1);

use App\Models\User;

test('returns a successful response', function () {
    User::factory()->administrator()->create();

    $response = $this->get(route('home'));

    $response->assertOk();
});
