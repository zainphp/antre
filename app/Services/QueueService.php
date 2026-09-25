<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\QueueSessionStatus;
use App\Enums\QueueStatus;
use App\Events\QueueChanged;
use App\Exceptions\QueueConflictException;
use App\Models\Counter;
use App\Models\Device;
use App\Models\QueueEntry;
use App\Models\QueueSession;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

final readonly class QueueService
{
    public function __construct(
        private AuditLogger $audit,
        private QueueStateService $stateService,
    ) {}

    /**
     * @return array<array-key, mixed>
     */
    public function state(
        bool $includeCallable = false,
        bool $includePhoto = false,
        int $waitingLimit = 20,
        bool $includeHistory = false,
    ): array {
        return $this->stateService->state(
            includeCallable: $includeCallable,
            includePhoto: $includePhoto,
            waitingLimit: $waitingLimit,
            includeHistory: $includeHistory,
        );
    }

    public function take(
        ?UploadedFile $photo,
        string $requestId,
        ?Device $device = null,
    ): QueueEntry {
        $photoPath = $photo?->store('queue-photos', 'local');

        try {
            $entry = DB::transaction(function () use ($photoPath, $requestId, $device): QueueEntry {
                $session = $this->lockCurrentSession();
                $existing = $session->entries()->where('request_id', $requestId)->first();
                if ($existing) {
                    if ($photoPath) {
                        Storage::disk('local')->delete($photoPath);
                    }

                    return $existing->load('counter');
                }

                $sequence = $session->next_sequence;
                $entry = QueueEntry::create([
                    'queue_session_id' => $session->id,
                    'sequence' => $sequence,
                    'number' => $this->formatNumber($session->prefix, $session->number_digits, $sequence),
                    'status' => QueueStatus::Waiting,
                    'photo_path' => $photoPath,
                    'request_id' => $requestId,
                    'device_id' => $device?->getKey(),
                ]);
                $session->update(['next_sequence' => $sequence + 1]);
                $this->audit->record('queue.taken', device: $device, subject: $entry);

                return $entry->load('counter');
            });
        } catch (\Throwable $exception) {
            if ($photoPath) {
                Storage::disk('local')->delete($photoPath);
            }

            throw $exception;
        }

        $this->broadcastStateChanged();

        return $entry;
    }

    public function callNext(?string $counterName, Device $device): QueueEntry
    {
        $entry = DB::transaction(function () use ($counterName, $device): QueueEntry {
            $session = $this->lockCurrentSession();
            $counter = $this->configuredCounter($counterName);
            if ($this->activeEntryForCounter($session, $counter->id)) {
                throw new QueueConflictException('Selesaikan nomor yang sedang dilayani sebelum memanggil berikutnya.');
            }

            $entry = $session->entries()
                ->where('status', QueueStatus::Waiting)
                ->orderBy('sequence')
                ->lockForUpdate()
                ->first();
            if (! $entry) {
                throw new QueueConflictException('Belum ada nomor yang menunggu.');
            }

            $entry->update([
                'status' => QueueStatus::Called,
                'counter_id' => $counter->id,
                'called_at' => now(),
            ]);
            $session->update([
                'current_entry_id' => $entry->id,
                'current_counter_id' => $counter->id,
            ]);
            $this->audit->record('queue.called', device: $device, subject: $entry, metadata: ['counter' => $counter->name]);

            return $entry->load('counter');
        });

        $this->broadcastStateChanged();

        return $entry;
    }

    public function recall(?string $counterName, ?string $entryId, Device $device): QueueEntry
    {
        $entry = DB::transaction(function () use ($counterName, $entryId, $device): QueueEntry {
            $session = $this->lockCurrentSession();
            $counter = $this->configuredCounter($counterName);
            $entry = $entryId
                ? $session->entries()->whereKey($entryId)->lockForUpdate()->first()
                : ($this->activeEntryForCounter($session, $counter->id)
                    ?? $session->entries()
                        ->where('status', QueueStatus::Skipped)
                        ->orderByDesc('completed_at')
                        ->orderByDesc('sequence')
                        ->lockForUpdate()
                        ->first());

            if (! $entry) {
                throw new QueueConflictException('Belum ada nomor yang dapat dipanggil ulang.');
            }

            if ($entry->status === QueueStatus::Completed) {
                throw new QueueConflictException('Nomor yang sudah selesai tidak dapat dipanggil kembali.');
            }

            if ($entry->status->isActive()) {
                if ($entry->counter_id !== $counter->id) {
                    $entry->loadMissing('counter');
                    $assignedCounter = $entry->counter;
                    throw new QueueConflictException(sprintf(
                        'Nomor ini sedang dipanggil oleh %s.',
                        $assignedCounter === null ? 'loket lain' : $assignedCounter->name,
                    ));
                }

                $this->ensureActive($entry);
                $entry->update(['called_at' => now()]);
                $session->update([
                    'current_entry_id' => $entry->id,
                    'current_counter_id' => $counter->id,
                ]);
                $this->audit->record('queue.recalled', device: $device, subject: $entry);

                return $entry->load('counter');
            }

            if (! $entry->status->canBeCalled()) {
                throw new QueueConflictException('Nomor ini belum dapat dipanggil kembali.');
            }

            $current = $this->activeEntryForCounter($session, $counter->id);
            if ($current) {
                $this->skipEntry($current, $device);
            }

            $fromStatus = $entry->status->value;
            $entry->update([
                'status' => QueueStatus::Called,
                'counter_id' => $counter->id,
                'called_at' => now(),
                'completed_at' => null,
            ]);
            $session->update([
                'current_entry_id' => $entry->id,
                'current_counter_id' => $counter->id,
            ]);
            $this->audit->record(
                'queue.recalled',
                device: $device,
                subject: $entry,
                metadata: ['from_status' => $fromStatus, 'counter' => $counter->name],
            );

            return $entry->load('counter');
        });

        $this->broadcastStateChanged();

        return $entry;
    }

    public function startServing(Device $device, ?string $counterName = null): QueueEntry
    {
        $entry = DB::transaction(function () use ($counterName, $device): QueueEntry {
            [$session, $entry] = $this->lockActiveEntry($counterName);
            if ($entry->status !== QueueStatus::Called) {
                throw new QueueConflictException('Nomor belum siap untuk dilayani.');
            }

            $entry->update(['status' => QueueStatus::Serving]);
            $this->audit->record('queue.serving', device: $device, subject: $entry);

            return $entry->load('counter');
        });

        $this->broadcastStateChanged();

        return $entry;
    }

    public function complete(Device $device, ?string $counterName = null): QueueEntry
    {
        return $this->finishCurrent(QueueStatus::Completed, 'queue.completed', 'Nomor ini belum dapat diselesaikan.', $device, $counterName);
    }

    public function skip(Device $device, ?string $counterName = null): QueueEntry
    {
        return $this->finishCurrent(QueueStatus::Skipped, 'queue.skipped', 'Nomor ini belum dapat dilewati.', $device, $counterName);
    }

    public function forfeit(
        ?string $counterName,
        ?string $entryId,
        string $reason,
        Device $device,
    ): QueueEntry {
        $reason = trim($reason);
        if ($reason === '') {
            throw new QueueConflictException('Alasan hangus wajib diisi.');
        }

        $entry = DB::transaction(function () use ($counterName, $device, $entryId, $reason): QueueEntry {
            [$session, $entry] = $this->lockActiveEntry($counterName);
            if ($entryId !== null && $entry->id !== $entryId) {
                throw new QueueConflictException('Nomor aktif sudah berubah. Periksa kembali sebelum menghanguskan.');
            }

            $entry->update([
                'status' => QueueStatus::Forfeited,
                'forfeit_reason' => $reason,
                'completed_at' => now(),
            ]);
            $this->audit->record(
                'queue.forfeited',
                device: $device,
                subject: $entry,
                metadata: [
                    'counter' => $entry->counter?->name,
                    'reason' => $reason,
                ],
            );
            $this->refreshCurrentPointer($session);

            return $entry->load('counter');
        });

        $this->broadcastStateChanged();

        return $entry;
    }

    public function reset(Device|User $actor): QueueSession
    {
        /** @var list<string> $photoPaths */
        $photoPaths = [];
        $session = DB::transaction(function () use ($actor, &$photoPaths): QueueSession {
            $current = $this->lockCurrentSession();
            $settings = Setting::current();
            $entries = $current->entries()->get();
            foreach ($entries as $entry) {
                if ($entry->photo_path !== null) {
                    $photoPaths[] = $entry->photo_path;
                }

                $updates = ['photo_path' => null];
                if (! $entry->status->isFinal()) {
                    $updates['status'] = QueueStatus::Skipped;
                    $updates['completed_at'] = now();
                }
                $entry->update($updates);
            }

            $current->update([
                'active_key' => null,
                'status' => QueueSessionStatus::Ended,
                'current_entry_id' => null,
                'current_counter_id' => null,
                'ended_at' => now(),
            ]);
            $next = QueueSession::create([
                'business_date' => $current->business_date,
                'active_key' => $current->business_date->format('Y-m-d'),
                'prefix' => $settings->default_prefix,
                'number_digits' => $settings->number_digits,
                'next_sequence' => 1,
                'status' => QueueSessionStatus::Running,
                'started_at' => now(),
            ]);
            $this->audit->record(
                'queue.reset',
                user: $actor instanceof User ? $actor : null,
                device: $actor instanceof Device ? $actor : null,
                subject: $next,
                metadata: ['archived_session_id' => $current->id],
            );

            return $next;
        });

        $this->deletePhotos($photoPaths);
        $this->broadcastStateChanged();

        return $session;
    }

    private function finishCurrent(
        QueueStatus $status,
        string $eventName,
        string $message,
        Device $device,
        ?string $counterName,
    ): QueueEntry {
        $entry = DB::transaction(function () use ($counterName, $status, $eventName, $message, $device): QueueEntry {
            [$session, $entry] = $this->lockActiveEntry($counterName);
            if (! $entry->status->isActive()) {
                throw new QueueConflictException($message);
            }

            if ($status === QueueStatus::Skipped) {
                $this->skipEntry($entry, $device);
            } else {
                $entry->update([
                    'status' => $status,
                    'completed_at' => now(),
                ]);
                $this->audit->record($eventName, device: $device, subject: $entry);
            }
            $this->refreshCurrentPointer($session);

            return $entry->load('counter');
        });

        $this->broadcastStateChanged();

        return $entry;
    }

    private function skipEntry(QueueEntry $entry, Device $device): void
    {
        $entry->update([
            'status' => QueueStatus::Skipped,
            'completed_at' => now(),
        ]);
        $this->audit->record('queue.skipped', device: $device, subject: $entry);
    }

    private function broadcastStateChanged(): void
    {
        event(new QueueChanged($this->state()));
    }

    /** @param list<string> $photoPaths */
    private function deletePhotos(array $photoPaths): void
    {
        $failed = 0;
        foreach ($photoPaths as $photoPath) {
            try {
                if (! Storage::disk('local')->delete($photoPath)) {
                    $failed++;
                }
            } catch (\Throwable $exception) {
                report($exception);
                $failed++;
            }
        }

        if ($failed > 0) {
            Log::warning('Some queue photos could not be deleted after session reset.', [
                'failed_count' => $failed,
            ]);
        }
    }

    private function currentSession(bool $create = true): ?QueueSession
    {
        $businessDate = now()->toDateString();
        $session = QueueSession::query()->where('active_key', $businessDate)->first();
        if ($session) {
            return $session;
        }

        if (! $create) {
            return null;
        }

        $settings = Setting::current();

        return QueueSession::query()->firstOrCreate(
            ['active_key' => $businessDate],
            [
                'business_date' => $businessDate,
                'prefix' => $settings->default_prefix,
                'number_digits' => $settings->number_digits,
                'next_sequence' => 1,
                'status' => QueueSessionStatus::Running,
                'started_at' => now(),
            ],
        );
    }

    private function lockCurrentSession(): QueueSession
    {
        return QueueSession::query()
            ->where('active_key', now()->toDateString())
            ->lockForUpdate()
            ->first() ?? $this->currentSession() ?? throw new \LogicException('Queue session could not be created.');
    }

    /** @return array{0: QueueSession, 1: QueueEntry} */
    private function lockActiveEntry(?string $counterName): array
    {
        $session = $this->lockCurrentSession();
        $counter = $this->configuredCounter($counterName);
        $entry = $this->activeEntryForCounter($session, $counter->id);
        if (! $entry) {
            throw new QueueConflictException('Belum ada nomor yang sedang dipanggil.');
        }

        return [$session, $entry];
    }

    private function activeEntryForCounter(QueueSession $session, string $counterId): ?QueueEntry
    {
        return $session->entries()
            ->where('counter_id', $counterId)
            ->whereIn('status', [QueueStatus::Called->value, QueueStatus::Serving->value])
            ->orderByDesc('called_at')
            ->orderByDesc('sequence')
            ->lockForUpdate()
            ->first();
    }

    private function refreshCurrentPointer(QueueSession $session): void
    {
        $current = $session->entries()
            ->whereIn('status', [QueueStatus::Called->value, QueueStatus::Serving->value])
            ->orderByDesc('called_at')
            ->orderByDesc('sequence')
            ->first();

        $session->update([
            'current_entry_id' => $current?->id,
            'current_counter_id' => $current?->counter_id,
        ]);
    }

    private function ensureActive(QueueEntry $entry): void
    {
        if (! $entry->status->isActive()) {
            throw new QueueConflictException('Nomor ini belum dapat dipanggil ulang.');
        }
    }

    private function configuredCounter(?string $counterName): Counter
    {
        $counterNames = Setting::current()->counterNames();
        $selectedCounter = trim($counterName ?? '');
        $selectedCounter = $selectedCounter === '' ? $counterNames[0] : $selectedCounter;
        if (! in_array($selectedCounter, $counterNames, true)) {
            throw new QueueConflictException('Loket yang dipilih tidak tersedia.');
        }

        $counter = Counter::firstOrCreate(['name' => $selectedCounter], ['active' => true]);
        if (! $counter->active) {
            throw new QueueConflictException('Loket yang dipilih tidak aktif.');
        }

        return $counter;
    }

    private function formatNumber(?string $prefix, int $digits, int $sequence): string
    {
        $prefix = $prefix === null ? null : strtoupper(trim($prefix));
        $prefix = $prefix === '' ? null : $prefix;
        if ($prefix !== null && ! preg_match('/^[A-Z0-9]{1,4}$/', $prefix)) {
            throw new QueueConflictException('Prefix nomor antrian tidak valid.');
        }

        if ($digits < 1 || $digits > 6) {
            throw new QueueConflictException('Jumlah digit nomor antrian tidak valid.');
        }

        return ($prefix ?? '').str_pad((string) $sequence, $digits, '0', STR_PAD_LEFT);
    }
}
