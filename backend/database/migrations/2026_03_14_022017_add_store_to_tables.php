<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('store')->default('WAN')->after('role');
        });
        Schema::table('items', function (Blueprint $table) {
            $table->string('store')->default('WAN')->after('id');
        });
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('store')->default('WAN')->after('id');
        });
        Schema::table('suppliers', function (Blueprint $table) {
            $table->string('store')->default('WAN')->after('id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('store');
        });
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn('store');
        });
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn('store');
        });
        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropColumn('store');
        });
    }
};
