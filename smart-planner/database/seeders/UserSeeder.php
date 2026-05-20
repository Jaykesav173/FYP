<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
{
    \App\Models\User::firstOrCreate(
        ['email' => 'student@smartplanner.com'],
        [
            'name'     => 'Jaykesav',
            'email'    => 'student@smartplanner.com',
            'password' => Hash::make('password123'),
        ]
    );
}
}