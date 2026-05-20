<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Stores each AI-generated schedule for a user.
     * A user can regenerate, creating a new schedule each time.
     */
    public function up(): void
    {
        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->constrained()
                  ->onDelete('cascade');
            $table->date('start_date');                    // First day of the 7-day plan
            $table->date('end_date');                      // Last day (start + 6 days)
            $table->string('summary')->nullable();         // AI-generated one-line summary
            $table->string('stress_level')->default('low'); // low / moderate / high / critical
            $table->unsignedTinyInteger('stress_score')->default(0); // 0-100
            $table->text('stress_message')->nullable();    // AI wellness message
            $table->json('stress_tips')->nullable();       // Array of tips from AI
            $table->text('ai_insight')->nullable();        // Full personalized advice paragraph
            $table->boolean('is_active')->default(true);  // Only one active schedule at a time
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedules');
    }
};