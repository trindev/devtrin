<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class MakeAdmin extends Command
{
    protected $signature = 'devtrin:make-admin {email} {--name=Admin} {--password= : ไม่ใส่ = สุ่มให้แล้วแสดงครั้งเดียว}';

    protected $description = 'สร้างหรือให้สิทธิ์ admin หลังบ้าน (/admin)';

    public function handle(): int
    {
        $email = Str::lower($this->argument('email'));
        $user = User::firstWhere('email', $email);
        $password = $this->option('password');

        if (! $user) {
            $password = $password ?: Str::password(16, symbols: false);
            $user = new User(['name' => $this->option('name'), 'email' => $email, 'password' => $password]);
        } elseif ($password) {
            $user->password = $password;
        }
        $user->is_admin = true;
        $user->save();

        $this->info("{$email} เป็น admin แล้ว — login ที่ ".url('/admin/login'));
        if ($password && ! $this->option('password')) {
            $this->warn("รหัสผ่าน: {$password}  (เปลี่ยนได้ที่ /admin/account)");
        }

        return self::SUCCESS;
    }
}
