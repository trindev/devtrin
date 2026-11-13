<?php

namespace App\Providers;

use App\Models\MailLog;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // บันทึกอีเมลที่ระบบส่งออก ให้แอดมินดูที่ /admin/mail
        Event::listen(MessageSent::class, function (MessageSent $event) {
            $to = collect($event->message->getTo())->map(fn ($a) => $a->getAddress())->implode(', ');
            MailLog::record($to, $event->message->getSubject(), 'sent');
        });
    }
}
