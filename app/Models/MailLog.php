<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MailLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['to', 'subject', 'mailer', 'status', 'error'];

    public static function record(string $to, ?string $subject, string $status, ?string $error = null): void
    {
        rescue(fn () => static::create([
            'to' => mb_substr($to, 0, 255), 'subject' => $subject ? mb_substr($subject, 0, 255) : null,
            'mailer' => (string) config('mail.default'), 'status' => $status, 'error' => $error ? mb_substr($error, 0, 500) : null,
        ]), report: false);
    }
}
