<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blocked_times', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('label');                    // e.g. "Morning Class", "Gym"
            $table->string('icon')->default('🚫');      // emoji icon
            $table->json('days');                       // ["Mon","Tue","Wed"]
            $table->time('start_time');                 // 08:00:00
            $table->time('end_time');                   // 10:00:00
            $table->string('color')->default('#C0483E');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blocked_times');
    }
};