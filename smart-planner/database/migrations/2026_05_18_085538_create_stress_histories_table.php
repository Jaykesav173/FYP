<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('stress_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('schedule_id')->nullable()->constrained()->onDelete('set null');
            $table->integer('stress_score');
            $table->string('stress_level'); // low, moderate, high, critical
            $table->date('recorded_date');
            $table->json('factors')->nullable(); // What contributed to stress
            $table->timestamps();
            
            $table->index(['user_id', 'recorded_date']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('stress_histories');
    }
};