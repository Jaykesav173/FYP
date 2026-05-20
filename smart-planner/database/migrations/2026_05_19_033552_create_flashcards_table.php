<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('flashcards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('flashcard_set_id')->constrained('flashcard_sets')->onDelete('cascade');
            $table->text('front');
            $table->text('back');
            
            // Per-card SRS
            $table->date('srs_next_review')->nullable();
            $table->float('srs_ease')->default(2.5);
            $table->integer('srs_interval')->default(0);
            $table->integer('srs_reps')->default(0);
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('flashcards');
    }
};
