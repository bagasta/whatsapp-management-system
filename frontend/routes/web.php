<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WaController;

Route::get('/', function () { return view('welcome'); });

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [WaController::class, 'dashboard'])->name('dashboard');

    Route::get('/api/sessions', [WaController::class, 'sessions']);
    Route::post('/api/sessions', [WaController::class, 'createSession']);
    Route::get('/api/sessions/{id}/qr', [WaController::class, 'qr']);
    Route::get('/api/sessions/{id}/status', [WaController::class, 'status']);

    Route::post('/api/sessions/{id}/send-message', [WaController::class, 'sendMessage']);
    Route::post('/api/sessions/{id}/send-media', [WaController::class, 'sendMedia']);
    Route::get('/api/sessions/{id}/chats', [WaController::class, 'chats']);
    Route::get('/api/sessions/{id}/contacts', [WaController::class, 'contacts']);
});

require __DIR__.'/auth.php';
