<?php

declare(strict_types=1);

use App\Models\User;

test('only administrators can view the admin dashboard', function () {
    $this->get(route('admin.index'))->assertRedirect(route('login'));

    $this->actingAs(User::factory()->create())
        ->get(route('admin.index'))
        ->assertForbidden();

    $this->actingAs(User::factory()->administrator()->create())
        ->get(route('admin.index'))
        ->assertOk();
});
