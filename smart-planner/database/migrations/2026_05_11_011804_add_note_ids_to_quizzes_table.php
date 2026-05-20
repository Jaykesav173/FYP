<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quizzes', function (Blueprint $table) {
            // Store all note IDs for multi-note quizzes
            $table->json('note_ids')->nullable()->after('note_id');
            // Combined title for multi-note quizzes
            $table->string('source_label')->nullable()->after('note_ids');
        });
    }

    public function down(): void
    {
        Schema::table('quizzes', function (Blueprint $table) {
            $table->dropColumn(['note_ids', 'source_label']);
        });
    }
};