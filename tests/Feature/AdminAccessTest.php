<?php

declare(strict_types=1);

use App\Models\User;

test('only administrators can view the admin dashboard', function () {
    $this->get(route('admin.index'))->assertRedirect(route('onboarding'));

    $administrator = User::factory()->administrator()->create();

    $this->actingAs(User::factory()->create())
        ->get(route('admin.index'))
        ->assertForbidden();

    $this->actingAs($administrator)
        ->get(route('admin.index'))
        ->assertOk();
});
