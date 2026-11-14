<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Conversation extends Model
{
    protected $fillable = ['user_id', 'last_message_at', 'admin_unread', 'user_unread'];

    protected $casts = ['last_message_at' => 'datetime', 'admin_unread' => 'integer', 'user_unread' => 'integer'];

    protected static function booted(): void
    {
        // ลบห้อง = ลบรูปแนบในห้องด้วย (แถวข้อความถูกลบด้วย cascade ซึ่งไม่เรียก event ของ Message)
        static::deleting(function (Conversation $conversation) {
            $conversation->messages()->whereNotNull('image_path')->pluck('image_path')->each(fn ($p) => \App\Support\ChatImage::delete($p));
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function latestMessage(): HasOne
    {
        return $this->hasOne(Message::class)->latestOfMany();
    }
}
