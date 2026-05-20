<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quizzes', function (Blueprint $table) {
            // SRS Columns
            $table->date('srs_next_review')->nullable();
            $table->float('srs_ease')->default(2.5);
            $table->integer('srs_interval')->default(0);
            $table->integer('srs_reps')->default(0);

            // Sharing Columns
            $table->uuid('share_token')->nullable()->unique();
            $table->boolean('is_public')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('quizzes', function (Blueprint $table) {
            $table->dropColumn([
                'srs_next_review', 'srs_ease', 'srs_interval', 'srs_reps',
                'share_token', 'is_public'
            ]);
        });
    }
};
