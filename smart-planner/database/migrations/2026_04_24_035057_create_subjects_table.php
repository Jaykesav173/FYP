<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Creates the subjects table to store each subject a student adds.
     */
    public function up(): void
    {
        Schema::create('subjects', function (Blueprint $table) {
            $table->id();                                   // Primary key (auto-increment)
            $table->foreignId('user_id')                   // Links to users table
                  ->constrained()
                  ->onDelete('cascade');                    // Delete subjects if user deleted
            $table->string('name');                        // Subject name e.g. "Machine Learning"
            $table->date('deadline');                      // Exam/assignment deadline
            $table->unsignedTinyInteger('difficulty');     // 1 (Easy) to 5 (Expert)
            $table->decimal('estimated_hours', 5, 1);     // e.g. 12.5 hours total
            $table->timestamps();                          // created_at, updated_at
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subjects');
    }
};