<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
$u = \App\Models\User::where('email', 'student@smartplanner.com')->first();
$u->password = \Illuminate\Support\Facades\Hash::make('password123');
$u->save();
echo 'Password reset successful.';
