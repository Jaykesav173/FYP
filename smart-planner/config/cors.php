<?php

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'register', 'logout', 'me'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter([
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        env('FRONTEND_URL'),  // ← Your Vercel URL (set in Render env vars)
    ]),

    'allowed_origins_patterns' => [
        // Allow all Vercel preview deployments for your project
        '#^https://.*\.vercel\.app$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];