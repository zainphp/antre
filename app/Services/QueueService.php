<?php

namespace App\Services;

use App\Enums\QueueSessionStatus;
use App\Enums\QueueStatus;
use App\Events\QueueChanged;
use App\Exceptions\QueueConflictException;
use App\Models\Counter;
use App\Models\Device;
use App\Models\QueueEntry;
use App\Models\QueueSession;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

final readonly class QueueService
{
    public function __construct(private AuditLogger $audit) {}

    /**
     * @return array<string, mixed>
     */
    public function state(): array
    {
        $session = $this->currentSession();
        $session->load(['currentEntry.counter']);

        $waiting = $session->entries()
            ->with('counter')
            ->where('status', QueueStatus::Waiting)
            ->orderBy('sequence')
            ->get();

        return [
            'session' => [
                'date' => $session->business_date->format('Y-m-d'),
                'service_name' => $session->service_name,
            ],
            'current' => $session->currentEntry && in_array(
                $session->currentEntry->status,
                [QueueStatus::Called, QueueStatus::Serving],
                true,
            ) ? $this->entryPayload($session->currentEntry) : null,
            'waiting' => $waiting->map(fn (QueueEntry $entry): array => $this->entryPayload($entry))->values()->all(),
            'stats' => [
                'total' => $session->entries()->count(),
                'waiting' => $waiting->count(),
                'completed' => $session->entries()->where('status', QueueStatus::Completed)->count(),
                'skipped' => $session->entries()->where('status', QueueStatus::Skipped)->count(),
            ],
        ];
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
                    'number' => $this->formatNumber($session->prefix, $sequence),
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

        event(new QueueChanged($this->state()));

        return $entry;
    }

    public function callNext(string $counterName, User $user): QueueEntry
    {
        $entry = DB::transaction(function () use ($counterName, $user): QueueEntry {
            $session = $this->lockCurrentSession();
            if ($session->current_entry_id) {
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

            $counter = Counter::firstOrCreate(['name' => trim($counterName) ?: '1'], ['active' => true]);
            if (! $counter->active) {
                throw new QueueConflictException('Loket yang dipilih tidak aktif.');
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
            $this->audit->record('queue.called', user: $user, subject: $entry, metadata: ['counter' => $counter->name]);

            return $entry->load('counter');
        });

        event(new QueueChanged($this->state()));

        return $entry;
    }

    public function recall(User $user): QueueEntry
    {
        $entry = DB::transaction(function () use ($user): QueueEntry {
            [$session, $entry] = $this->lockCurrentEntry();
            $this->ensureActive($entry);
            $entry->update(['called_at' => now()]);
            $this->audit->record('queue.recalled', user: $user, subject: $entry);

            return $entry->load('counter');
        });

        event(new QueueChanged($this->state()));

        return $entry;
    }

    public function startServing(User $user): QueueEntry
    {
        $entry = DB::transaction(function () use ($user): QueueEntry {
            [$session, $entry] = $this->lockCurrentEntry();
            if ($entry->status !== QueueStatus::Called) {
                throw new QueueConflictException('Nomor belum siap untuk dilayani.');
            }

            $entry->update(['status' => QueueStatus::Serving]);
            $this->audit->record('queue.serving', user: $user, subject: $entry);

            return $entry->load('counter');
        });

        event(new QueueChanged($this->state()));

        return $entry;
    }

    public function complete(User $user): QueueEntry
    {
        return $this->finishCurrent(QueueStatus::Completed, 'queue.completed', 'Nomor ini belum dapat diselesaikan.', $user);
    }

    public function skip(User $user): QueueEntry
    {
        return $this->finishCurrent(QueueStatus::Skipped, 'queue.skipped', 'Nomor ini belum dapat dilewati.', $user);
    }

    public function reset(User $user): QueueSession
    {
        $session = DB::transaction(function () use ($user): QueueSession {
            $current = $this->lockCurrentSession();
            $entries = $current->entries()
                ->whereNotIn('status', [QueueStatus::Completed, QueueStatus::Skipped])
                ->get();
            foreach ($entries as $entry) {
                if ($entry->photo_path) {
                    Storage::disk('local')->delete($entry->photo_path);
                }
                $entry->update([
                    'status' => QueueStatus::Skipped,
                    'completed_at' => now(),
                    'photo_path' => null,
                ]);
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
                'prefix' => $current->prefix,
                'service_name' => $current->service_name,
                'next_sequence' => 1,
                'status' => QueueSessionStatus::Running,
                'started_at' => now(),
            ]);
            $this->audit->record('queue.reset', user: $user, subject: $next, metadata: ['archived_session_id' => $current->id]);

            return $next;
        });

        event(new QueueChanged($this->state()));

        return $session;
    }

    private function finishCurrent(QueueStatus $status, string $eventName, string $message, User $user): QueueEntry
    {
        $entry = DB::transaction(function () use ($status, $eventName, $message, $user): QueueEntry {
            [$session, $entry] = $this->lockCurrentEntry();
            if (! in_array($entry->status, [QueueStatus::Called, QueueStatus::Serving], true)) {
                throw new QueueConflictException($message);
            }

            if ($entry->photo_path) {
                Storage::disk('local')->delete($entry->photo_path);
            }
            $entry->update([
                'status' => $status,
                'completed_at' => now(),
                'photo_path' => null,
            ]);
            $session->update(['current_entry_id' => null, 'current_counter_id' => null]);
            $this->audit->record($eventName, user: $user, subject: $entry);

            return $entry->load('counter');
        });

        event(new QueueChanged($this->state()));

        return $entry;
    }

    private function currentSession(): QueueSession
    {
        $businessDate = now()->toDateString();
        $session = QueueSession::query()->where('active_key', $businessDate)->first();
        if ($session) {
            return $session;
        }

        return QueueSession::query()->firstOrCreate(
            ['active_key' => $businessDate],
            [
                'business_date' => $businessDate,
                'prefix' => 'A',
                'service_name' => 'Pelayanan TBS',
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
            ->first() ?? $this->currentSession();
    }

    /** @return array{0: QueueSession, 1: QueueEntry} */
    private function lockCurrentEntry(): array
    {
        $session = $this->lockCurrentSession();
        $entry = $session->entries()->whereKey($session->current_entry_id)->lockForUpdate()->first();
        if (! $entry) {
            throw new QueueConflictException('Belum ada nomor yang sedang dipanggil.');
        }

        return [$session, $entry];
    }

    private function ensureActive(QueueEntry $entry): void
    {
        if (! in_array($entry->status, [QueueStatus::Called, QueueStatus::Serving], true)) {
            throw new QueueConflictException('Nomor ini belum dapat dipanggil ulang.');
        }
    }

    private function formatNumber(string $prefix, int $sequence): string
    {
        $prefix = strtoupper(trim($prefix));
        if (! preg_match('/^[A-Z0-9]{1,4}$/', $prefix)) {
            throw new QueueConflictException('Prefix nomor antrian tidak valid.');
        }

        return $prefix.'-'.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT);
    }

    /** @return array<string, mixed> */
    private function entryPayload(QueueEntry $entry): array
    {
        return [
            'id' => $entry->id,
            'number' => $entry->number,
            'status' => $entry->status->value,
            'counter' => $entry->counter?->name,
            'created_at' => $entry->created_at?->toISOString(),
            'called_at' => $entry->called_at?->toISOString(),
        ];
    }
}
