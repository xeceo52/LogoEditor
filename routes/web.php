<?php

use App\Http\Controllers\RemoveBgController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('logo');
});

Route::post('/remove-bg', [\App\Http\Controllers\RemoveBgController::class, 'remove']);

Route::post('/straighten', [RemoveBgController::class, 'straighten']);
