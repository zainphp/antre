<?php

declare(strict_types=1);

use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

test('web pages redirect to onboarding before an administrator exists', function () {
    $this->get(route('home'))->assertRedirect(route('onboarding'));
    $this->get(route('login'))->assertRedirect(route('onboarding'));
    $this->get(route('pair'))->assertRedirect(route('onboarding'));
});

test('onboarding creates the first administrator and initial settings', function () {
    $response = $this->post(route('onboarding.store'), [
        'name' => 'Administrator Pertama',
        'email' => 'admin@example.com',
        'password' => 'password-secret',
        'password_confirmation' => 'password-secret',
        'brand_name' => 'Koperasi Kita',
        'session_name' => 'Pelayanan Warga',
        'default_prefix' => null,
        'number_digits' => 4,
        'number_counters' => 3,
    ]);

    $response->assertRedirect(route('admin.index'));

    $administrator = User::query()->firstOrFail();
    expect($administrator->isAdministrator())->toBeTrue()
        ->and($administrator->name)->toBe('Administrator Pertama')
        ->and(Hash::check('password-secret', $administrator->password))->toBeTrue()
        ->and(auth()->id())->toBe($administrator->id);

    expect(Setting::current()->brand_name)->toBe('Koperasi Kita')
        ->and(Setting::current()->session_name)->toBe('Pelayanan Warga')
        ->and(Setting::current()->default_prefix)->toBeNull()
        ->and(Setting::current()->number_digits)->toBe(4)
        ->and(Setting::current()->number_counters)->toBe(3);
});

test('onboarding is redirected once an administrator exists', function () {
    User::factory()->administrator()->create();

    $this->get(route('onboarding'))->assertRedirect(route('login'));
});
