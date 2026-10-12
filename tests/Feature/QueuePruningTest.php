<?php

declare(strict_types=1);

use App\Models\AuditEvent;
use App\Models\QueueEntry;
use App\Models\QueueSession;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Storage;

test('pruning removes expired sessions and their tickets and photos while retaining recent data', function (string $date, string $expiredDate, string $boundaryDate) {
    $this->travelTo(Date::parse($date));
    Storage::fake('local');
    $expired = QueueSession::factory()->state(['business_date' => $expiredDate])->active()->create();
    $expiredEntry = QueueEntry::factory()->for($expired, 'session')->create(['photo_path' => 'queue-photos/expired.jpg']);
    $expired->update(['current_entry_id' => $expiredEntry->id]);
    $boundary = QueueSession::factory()->state(['business_date' => $boundaryDate])->active()->create();
    $boundaryEntry = QueueEntry::factory()->for($boundary, 'session')->create(['photo_path' => 'queue-photos/boundary.jpg']);
    $today = QueueSession::factory()->active()->create();
    $todayEntry = QueueEntry::factory()->for($today, 'session')->create();
    $audit = AuditEvent::factory()->create(['subject_type' => QueueEntry::class, 'subject_id' => $expiredEntry->id]);
    Storage::disk('local')->put('queue-photos/expired.jpg', 'expired photo');
    Storage::disk('local')->put('queue-photos/boundary.jpg', 'retained photo');

    $this->artisan('model:prune', ['--model' => [QueueSession::class]])->assertSuccessful();

    $this->assertModelMissing($expired);
    $this->assertModelMissing($expiredEntry);
    $this->assertModelExists($boundary);
    $this->assertModelExists($boundaryEntry);
    $this->assertModelExists($today);
    $this->assertModelExists($todayEntry);
    $this->assertModelExists($audit);
    Storage::disk('local')->assertMissing('queue-photos/expired.jpg');
    Storage::disk('local')->assertExists('queue-photos/boundary.jpg');

    $this->artisan('model:prune', ['--model' => [QueueSession::class]])->assertSuccessful();
    $this->assertModelExists($boundary);
})->with([
    'regular date' => ['2026-10-13 00:30:00', '2026-07-12', '2026-07-13'],
    'month end' => ['2026-05-31 00:30:00', '2026-02-27', '2026-02-28'],
]);

test('pruning can retry sessions whose photos are already missing', function () {
    $this->travelTo(Date::parse('2026-10-13 00:30:00'));
    Storage::fake('local');
    $session = QueueSession::factory()->create(['business_date' => '2026-07-12']);
    $entry = QueueEntry::factory()->for($session, 'session')->create(['photo_path' => 'queue-photos/missing.jpg']);

    $this->artisan('model:prune', ['--model' => [QueueSession::class]])->assertSuccessful();

    $this->assertModelMissing($session);
    $this->assertModelMissing($entry);
    Storage::disk('local')->assertMissing('queue-photos/missing.jpg');
});

test('pruning retains sessions and tickets when photo deletion fails', function () {
    $this->travelTo(Date::parse('2026-10-13 00:30:00'));
    $session = QueueSession::factory()->create(['business_date' => '2026-07-12']);
    $entry = QueueEntry::factory()->for($session, 'session')->create(['photo_path' => 'queue-photos/failed.jpg']);
    Storage::shouldReceive('disk')->with('local')->once()->andReturnSelf();
    Storage::shouldReceive('delete')->with('queue-photos/failed.jpg')->once()->andReturnFalse();

    expect(fn () => $session->prune())->toThrow(RuntimeException::class, 'Could not delete queue photo');

    $this->assertModelExists($session);
    $this->assertModelExists($entry);
});
