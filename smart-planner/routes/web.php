<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->away('http://localhost:3000/login');
});

Route::get('/{any}', function () {
    return redirect()->away('http://localhost:3000/login');
})->where('any', '.*');