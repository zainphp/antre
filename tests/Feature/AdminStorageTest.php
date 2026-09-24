<?php

declare(strict_types=1);

use App\Enums\QueueStatus;
use App\Events\QueueChanged;
use App\Models\AuditEvent;
use App\Models\QueueEntry;
use App\Models\User;
use App\Services\QueueService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

test('an administrator can view queue storage usage', function () {
    $admin = User::factory()->administrator()->create();
    Storage::fake('local');
    Storage::disk('local')->put('queue-photos/customer.jpg', 'photo');
    QueueEntry::factory()->create(['photo_path' => 'queue-photos/customer.jpg']);
    QueueEntry::factory()->create();

    $this->actingAs($admin)
        ->get(route('admin.storage'))
        ->assertOk()
        ->assertInertia(
            fn (Assert $page): Assert => $page
                ->component('admin/storage')
                ->where('ticketCount', 2)
                ->where('photoCount', 1)
                ->where('photoStorageBytes', 5),
        );
});

test('an administrator can reset the active queue session from storage', function () {
    Event::fake([QueueChanged::class]);
    Storage::fake('local');
    $admin = User::factory()->administrator()->create();
    $entry = app(QueueService::class)->take(
        UploadedFile::fake()->image('customer.jpg'),
        (string) Str::uuid(),
    );
    $photoPath = $entry->photo_path;

    $response = $this->actingAs($admin)->post(route('admin.storage.reset'));

    $response->assertRedirect()->assertSessionHas('success');
    expect($entry->fresh())
        ->status->toBe(QueueStatus::Skipped)
        ->photo_path->toBeNull();

    expect(AuditEvent::query()
        ->where('event_name', 'queue.reset')
        ->where('user_id', $admin->id)
        ->exists())->toBeTrue();

    if (is_string($photoPath)) {
        Storage::disk('local')->assertMissing($photoPath);
    }
});

test('non-administrators cannot manage queue storage', function () {
    User::factory()->administrator()->create();
    $operator = User::factory()->create();

    $this->actingAs($operator)
        ->get(route('admin.storage'))
        ->assertForbidden();

    $this->actingAs($operator)
        ->post(route('admin.storage.reset'))
        ->assertForbidden();
});
