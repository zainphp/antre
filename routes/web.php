<?php

declare(strict_types=1);

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AdminStorageController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\DeviceController;
use App\Http\Controllers\DevicePairController;
use App\Http\Controllers\IntegrationController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\QueueController;
use App\Http\Controllers\QueueSettingsController;
use App\Http\Controllers\RootController;
use Illuminate\Support\Facades\Route;

Route::get('/onboarding', [OnboardingController::class, 'create'])->name('onboarding');
Route::post('/onboarding', [OnboardingController::class, 'store'])
    ->middleware('throttle:6,1')
    ->name('onboarding.store');

Route::get('/', RootController::class)->name('home');
Route::get('/pair', [DevicePairController::class, 'show'])->name('pair');

Route::middleware('guest')->group(function (): void {
    Route::get('/login', [LoginController::class, 'create'])->name('login');
    Route::post('/login', [LoginController::class, 'store'])->middleware('throttle:login')->name('login.store');
});

Route::post('/logout', [LoginController::class, 'destroy'])->middleware('auth')->name('logout');

Route::get('/display', [PageController::class, 'display'])
    ->middleware(['device.auth', 'device.role:DISPLAY'])
    ->name('display');

Route::middleware(['device.auth', 'device.role:QUEUE_TERMINAL'])->group(function (): void {
    Route::get('/queue-terminal', [PageController::class, 'queueTerminal'])->name('queue-terminal');
    Route::get('/queue-terminal/settings', [PageController::class, 'queueTerminalSettings'])->name('queue-terminal.settings');
    Route::post('/queue-terminal/queue/take', [QueueController::class, 'take'])->name('queue.take');
});

Route::middleware(['device.auth', 'device.role:OPERATOR_TERMINAL'])->group(function (): void {
    Route::get('/operator-terminal', [PageController::class, 'operatorTerminal'])->name('operator-terminal');
    Route::get('/operator-terminal/queue/photo/{entry}', [QueueController::class, 'photo'])->name('operator.queue.photo');
    Route::post('/operator-terminal/queue/call-next', [QueueController::class, 'callNext'])->name('queue.call-next');
    Route::post('/operator-terminal/queue/recall', [QueueController::class, 'recall'])->name('queue.recall');
    Route::post('/operator-terminal/queue/serve', [QueueController::class, 'serve'])->name('queue.serve');
    Route::post('/operator-terminal/queue/complete', [QueueController::class, 'complete'])->name('queue.complete');
    Route::post('/operator-terminal/queue/skip', [QueueController::class, 'skip'])->name('queue.skip');
    Route::post('/operator-terminal/queue/reset', [QueueController::class, 'reset'])->name('queue.reset');
});

Route::middleware(['auth', 'user.role:ADMINISTRATOR'])->prefix('admin')->name('admin.')->group(function (): void {
    Route::get('/', AdminController::class)->name('index');
    Route::get('/storage', [AdminStorageController::class, 'index'])->name('storage');
    Route::post('/storage/reset', [AdminStorageController::class, 'reset'])->name('storage.reset');
    Route::get('/devices', [DeviceController::class, 'index'])->name('devices');
    Route::post('/devices/pairing-session', [DeviceController::class, 'openPairingSession'])->name('devices.pairing-session');
    Route::post('/devices/pairing-session/close', [DeviceController::class, 'closePairingSession'])->name('devices.pairing-session.close');
    Route::patch('/devices/{device}/assign', [DeviceController::class, 'assign'])->name('devices.assign');
    Route::patch('/devices/{device}/revoke', [DeviceController::class, 'revoke'])->name('devices.revoke');
    Route::delete('/devices/{device}', [DeviceController::class, 'destroy'])->name('devices.destroy');
    Route::get('/settings', [QueueSettingsController::class, 'edit'])->name('settings');
    Route::patch('/settings', [QueueSettingsController::class, 'update'])->name('settings.update');
    Route::get('/integrations', [IntegrationController::class, 'index'])->name('integrations');
    Route::post('/integrations/sentry/backend', [IntegrationController::class, 'testBackendSentry'])
        ->name('integrations.sentry.backend');
    Route::post('/integrations/{connection}', [IntegrationController::class, 'testBroadcast'])
        ->whereIn('connection', ['ably', 'reverb'])
        ->name('integrations.broadcast');
});
