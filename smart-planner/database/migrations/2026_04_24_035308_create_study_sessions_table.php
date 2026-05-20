<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Each row is one study block (e.g. "Machine Learning on Mon 10:00 for 60 mins")
     * Many sessions belong to one schedule.
     */
    public function up(): void
    {
        Schema::create('study_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_id')
                  ->constrained('schedules')
                  ->onDelete('cascade');           // Delete sessions when schedule deleted
            $table->foreignId('subject_id')
                  ->constrained('subjects')
                  ->onDelete('cascade');           // Delete sessions when subject deleted
            $table->date('session_date');          // Which day this session falls on
            $table->string('day_name');            // "Mon", "Tue", etc. for display
            $table->time('start_time');            // e.g. "09:00:00"
            $table->unsignedSmallInteger('duration_minutes'); // e.g. 60
            $table->enum('priority', ['high', 'medium', 'low'])->default('medium');
            $table->string('note')->nullable();    // AI tip for this session
            $table->decimal('predicted_hours', 4, 1)->nullable(); // ML time prediction
            $table->decimal('prediction_confidence', 3, 2)->nullable(); // 0.00 to 1.00
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('study_sessions');
    }
};