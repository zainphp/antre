<?php

declare(strict_types=1);

use App\Http\Controllers\PublicController;
use Illuminate\Support\Facades\Route;

Route::get('/queue/state', [PublicController::class, 'queueState'])
    ->middleware('throttle:public-queue')
    ->name('api.queue.state');
