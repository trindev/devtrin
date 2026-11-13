<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('google_id')->nullable()->unique();
            $table->string('avatar', 500)->nullable();
            $table->text('mail_signature')->nullable();
        });

        // ห้องแชทของผู้เข้าชมแต่ละคน (คนละ 1 ห้อง) คุยกับทีมงาน
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->timestamp('last_message_at')->nullable()->index();
            $table->unsignedInteger('admin_unread')->default(0);
            $table->unsignedInteger('user_unread')->default(0);
            $table->timestamps();
        });

        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('from_admin')->default(false);
            $table->text('body');
            $table->timestamps();

            $table->index(['conversation_id', 'id']);
        });

        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('endpoint');
            $table->string('endpoint_hash', 64)->unique();
            $table->string('public_key', 200);
            $table->string('auth_token', 100);
            $table->string('content_encoding', 20)->default('aes128gcm');
            $table->string('user_agent')->nullable();
            $table->timestamps();
        });

        Schema::create('mail_logs', function (Blueprint $table) {
            $table->id();
            $table->string('to', 255);
            $table->string('subject', 255)->nullable();
            $table->string('mailer', 30);
            $table->string('status', 10); // sent | failed
            $table->string('error', 500)->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mail_logs');
        Schema::dropIfExists('push_subscriptions');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversations');
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['google_id']);
            $table->dropColumn(['google_id', 'avatar', 'mail_signature']);
        });
    }
};
