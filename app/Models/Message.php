<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    protected $fillable = ['conversation_id', 'user_id', 'from_admin', 'body'];

    protected $casts = ['from_admin' => 'boolean'];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** รูปแบบที่ส่งให้หน้าเว็บ (ทั้งฝั่งผู้เข้าชมและหลังบ้าน) */
    public function toChat(): array
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'from_admin' => $this->from_admin,
            'sender' => $this->from_admin ? ($this->sender?->name ?? 'ทีมงาน') : null,
            'at' => $this->created_at?->toIso8601String(),
        ];
    }
}
