<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\DeviceController;
use App\Http\Controllers\DevicePairController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\QueueController;
use App\Http\Controllers\RootController;
use Illuminate\Support\Facades\Route;

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
    Route::get('/take-number', [PageController::class, 'takeNumber'])->name('take-number');
    Route::post('/device/queue/take', [QueueController::class, 'take'])->name('queue.take');
});

Route::middleware([
    'auth',
    'user.role:ADMINISTRATOR,OPERATOR',
    'device.auth',
    'device.role:OPERATOR_TERMINAL',
])->group(function (): void {
    Route::get('/operator', [PageController::class, 'operator'])->name('operator');
    Route::post('/operator/queue/call-next', [QueueController::class, 'callNext'])->name('queue.call-next');
    Route::post('/operator/queue/recall', [QueueController::class, 'recall'])->name('queue.recall');
    Route::post('/operator/queue/serve', [QueueController::class, 'serve'])->name('queue.serve');
    Route::post('/operator/queue/complete', [QueueController::class, 'complete'])->name('queue.complete');
    Route::post('/operator/queue/skip', [QueueController::class, 'skip'])->name('queue.skip');
    Route::post('/operator/queue/reset', [QueueController::class, 'reset'])->name('queue.reset');
});

Route::middleware(['auth', 'user.role:ADMINISTRATOR'])->prefix('admin')->name('admin.')->group(function (): void {
    Route::get('/devices', [DeviceController::class, 'index'])->name('devices');
    Route::patch('/devices/{device}/assign', [DeviceController::class, 'assign'])->name('devices.assign');
    Route::patch('/devices/{device}/revoke', [DeviceController::class, 'revoke'])->name('devices.revoke');
});
