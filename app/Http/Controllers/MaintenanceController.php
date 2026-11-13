<?php

namespace App\Http\Controllers;

use App\Services\Doctor;
use App\Services\SelfUpdater;
use App\Support\AppVersion;
use App\Support\MaintenanceSwitch;
use App\Support\OpcacheHeal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\View\View;

class MaintenanceController extends Controller
{
    /**
     * คำสั่งที่กดได้จากหน้าเว็บ (whitelist — ห้ามรับชื่อคำสั่งจาก request ตรงๆ)
     * key => [คำสั่ง, argument, ชื่อปุ่ม, คำอธิบายสั้น, หมวด, ต้องยืนยันก่อน]
     */
    private const ACTIONS = [
        'migrate' => ['migrate', ['--force' => true], 'รัน migration', 'อัปเดตโครงสร้างฐานข้อมูล หลังอัปโหลดเวอร์ชันใหม่เอง', 'deploy', 'รัน migration บนฐานข้อมูลจริง? ควร backup ก่อน'],
        'optimize-clear' => ['optimize:clear', [], 'ล้าง cache ทั้งหมด', 'หลังแก้ .env หรือเมื่อค่าที่ตั้งไว้ไม่อัปเดต', 'deploy', null],
        'optimize' => ['optimize', [], 'Cache config/route/view', 'ทำหลังล้าง cache ให้เว็บเร็วขึ้น', 'deploy', null],
        'opcache-reset' => ['devtrin:opcache-reset', [], 'ล้าง OPcache', 'ไฟล์ตรงกับ release แต่ยังเจอ error ชื่อไฟล์หรือฟังก์ชันเพี้ยน', 'fix', null],
    ];

    public function show(Request $request, Doctor $doctor, SelfUpdater $updater): View|JsonResponse
    {
        $checks = $doctor->run($request->boolean('deep'));
        $status = Doctor::summarize($checks);

        if ($request->wantsJson() || $request->query('format') === 'json') {
            // uptime monitor: 503 เมื่อมีรายการ fail
            return response()->json(['status' => $status, 'checked_at' => now()->toIso8601String(), 'checks' => $checks], $status === Doctor::FAIL ? 503 : 200);
        }

        $down = app()->isDownForMaintenance() ? app()->maintenanceMode()->data() : null;

        return view('maintenance.doctor', [
            'checks' => collect($checks)->groupBy('group'),
            'status' => $status,
            'deep' => $request->boolean('deep'),
            'isAdmin' => (bool) $request->user()?->is_admin,
            'down' => $down,
            'actions' => collect(self::ACTIONS)->map(fn ($a, $key) => ['key' => $key, 'title' => $a[2], 'hint' => $a[3], 'group' => $a[4], 'confirm' => $a[5]])->groupBy('group'),
            'app' => AppVersion::toArray(),
            'update' => $request->user()?->is_admin ? $this->updateInfo($updater, $request->boolean('refresh')) : null,
        ]);
    }

    private function updateInfo(SelfUpdater $updater, bool $refresh): array
    {
        if (! $updater->configured()) {
            return ['configured' => false];
        }
        try {
            $releases = $updater->releases($refresh);
            $error = null;
        } catch (\Throwable $e) {
            // หน้านี้ดัก error เอง จึงไม่ผ่านตัวกู้คืนกลาง — เช็กอาการ OPcache เสียตรงนี้ด้วย
            $error = OpcacheHeal::looksCorrupted($e)
                ? (OpcacheHeal::reset($e)
                    ? 'OPcache ของ host เสีย (ข้อความในหน่วยความจำเพี้ยน) — ระบบล้างให้แล้ว รีเฟรชหน้านี้อีกครั้ง'
                    : 'OPcache ของ host เสีย — กด "ล้าง OPcache" ด้านล่าง หรือใช้ recover.php')
                : 'เชื่อมต่อ GitHub ไม่ได้: '.$e->getMessage();
            $releases = [];
        }

        return [
            'configured' => true,
            'releases' => $releases,
            'available' => $error === null && $updater->updateAvailable(),
            'latest' => $error === null ? $updater->latest() : null,
            'writable_problems' => $updater->writableProblems(),
            'error' => $error,
        ];
    }

    /** ขั้นที่ 1: ปิดเว็บ → ดาวน์โหลด/สลับไฟล์ → ส่งต่อไปขั้นที่ 2 ใน request ใหม่ (ใช้โค้ดเวอร์ชันใหม่) */
    public function installUpdate(Request $request, SelfUpdater $updater): RedirectResponse
    {
        $data = $request->validate(['tag' => ['required', 'string', 'regex:/^v\d+\.\d+\.\d+([-.][\w.]+)?$/']]);
        $wasDown = app()->isDownForMaintenance();
        if (! $wasDown) {
            MaintenanceSwitch::down(Str::random(32)); // ไม่ใช้ Artisan — ต้องอัปเดตได้แม้ vendor เดิมเสีย
        }

        try {
            $version = $updater->install($data['tag']);
        } catch (\Throwable $e) {
            if (! $wasDown) {
                MaintenanceSwitch::up();
            }
            self::log('self_update_failed', ['tag' => $data['tag'], 'error' => $e->getMessage()]);

            return redirect('/_maintenance')->with('status', 'อัปเดตไม่สำเร็จ (เว็บยังเป็นเวอร์ชันเดิม): '.$e->getMessage());
        }

        $key = Str::random(40);
        cache()->put("self-update:finish:{$key}", ['version' => $version, 'reopen' => ! $wasDown], 3600);
        self::log('self_update_installed', ['tag' => $data['tag']]);

        return redirect('/_maintenance/update/finish?key='.$key);
    }

    /** ขั้นที่ 2: รันด้วยโค้ดใหม่ — migrate, cache, เปิดเว็บ */
    public function finishUpdate(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->is_admin, 404);
        $state = cache()->pull('self-update:finish:'.$request->query('key'));
        abort_unless($state, 404);

        // ไฟล์เพิ่งถูกสลับ — ทิ้งโค้ดที่ compile ค้างในหน่วยความจำ (ล้างไม่ได้ก็ไม่เป็นไร OPcache ตรวจ timestamp เองอยู่แล้ว)
        if (function_exists('opcache_reset')) {
            @opcache_reset();
        }

        $steps = [];
        foreach ([['migrate', ['--force' => true]], ['optimize:clear', []], ['optimize', []]] as [$command, $args]) {
            try {
                $code = Artisan::call($command, $args);
            } catch (\Throwable $e) {
                return redirect('/_maintenance')->with('status', "ติดตั้ง v{$state['version']} แล้ว แต่ {$command} ล้มเหลว — เว็บยังปิดอยู่: {$e->getMessage()}");
            }
            $steps[] = "{$command}: ".($code === 0 ? 'ok' : 'ผิดพลาด');
            if ($code !== 0) {
                return redirect('/_maintenance')->with('status', "ติดตั้ง v{$state['version']} แล้ว แต่ {$command} ล้มเหลว — เว็บยังปิดอยู่ ตรวจ log แล้วกดรันซ้ำ หรือติดตั้งเวอร์ชันก่อนหน้า: ".trim(Artisan::output()));
            }
        }
        if ($state['reopen']) {
            MaintenanceSwitch::up();
        }
        self::log('self_update_finished', ['version' => $state['version'], 'steps' => $steps]);

        return redirect('/_maintenance')->with('status', "อัปเดตเป็น v{$state['version']} สำเร็จ (".implode(', ', $steps).')');
    }

    public function down(Request $request): RedirectResponse
    {
        $data = $request->validate(['message' => 'nullable|string|max:200', 'retry' => 'nullable|integer|min:60|max:86400']);
        $secret = Str::random(32);

        // ต้องเก็บข้อความก่อนปิดเว็บ เพราะหน้า 503 ถูก render ไว้ล่วงหน้าตอนปิด
        cache()->forever('maintenance_message', $data['message'] ?? null);
        MaintenanceSwitch::down($secret, $data['retry'] ?? null);
        self::log('maintenance_down', ['message' => $data['message'] ?? null]);

        // เข้า /{secret} เพื่อรับ bypass cookie แล้ว Laravel จะพากลับหน้าแรก — admin ยังใช้เว็บได้ตามปกติ
        return redirect('/'.$secret);
    }

    public function up(Request $request): RedirectResponse
    {
        MaintenanceSwitch::up();
        cache()->forget('maintenance_message');
        self::log('maintenance_up');

        return redirect('/_maintenance')->with('status', 'ปิด maintenance mode แล้ว — เว็บเปิดให้ใช้งานตามปกติ');
    }

    public function action(Request $request, string $action): RedirectResponse
    {
        abort_unless(isset(self::ACTIONS[$action]), 404);
        [$command, $arguments] = self::ACTIONS[$action];

        try {
            Artisan::call($command, $arguments);
        } catch (\Throwable $e) {
            return redirect('/_maintenance')->with('status', "รัน {$command} ไม่ได้: {$e->getMessage()} — ถ้าเป็นไฟล์ใน vendor หาย ให้กดอัปเดต/ติดตั้งเวอร์ชันเดิมซ้ำ หรืออัปโหลด zip ใหม่");
        }
        self::log("maintenance_{$action}");

        // ผลจาก artisan มีจุดนำสายตาและสี ANSI — ตัดออกแล้วแสดงแยกเป็นรายละเอียดที่กดเปิดได้
        $output = trim(preg_replace(['/\e\[[\d;]*m/', '/\s*\.{3,}\s*/', '/[ \t]+/'], ['', ' … ', ' '], Artisan::output()));

        return redirect('/_maintenance')
            ->with('status', self::ACTIONS[$action][2].' เสร็จแล้ว')
            ->with('status_detail', $output !== '' ? "php artisan {$command}\n{$output}" : null);
    }

    private static function log(string $action, array $context = []): void
    {
        Log::info("maintenance: {$action}", ['user' => request()->user()?->email, ...$context]);
    }
}
