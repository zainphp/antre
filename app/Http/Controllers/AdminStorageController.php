<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\QueueEntry;
use App\Models\User;
use App\Services\QueueService;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

final class AdminStorageController extends Controller
{
    public function index(): Response
    {
        $disk = Storage::disk('local');
        $photoPaths = $disk->allFiles('queue-photos');

        return Inertia::render('admin/storage', [
            'ticketCount' => QueueEntry::query()->count(),
            'photoCount' => QueueEntry::query()->whereNotNull('photo_path')->count(),
            'photoStorageBytes' => array_sum(
                array_map(
                    $disk->size(...),
                    $photoPaths,
                ),
            ),
        ]);
    }

    public function reset(#[CurrentUser] User $user, QueueService $queues): RedirectResponse
    {
        $queues->reset($user);

        return back()->with('success', 'Sesi antrian direset. Riwayat tiket tetap tersimpan.');
    }
}
