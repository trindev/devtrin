<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * เติมคำโปรย/รายละเอียดของโปรเจกต์ตั้งต้นจากหน้าเว็บจริง — เติมเฉพาะช่องที่ยังว่าง ไม่ทับสิ่งที่แก้ในหลังบ้านแล้ว
 * ชื่อเปลี่ยนเฉพาะเมื่อยังเป็นชื่อตั้งต้นจาก seeder
 */
return new class extends Migration
{
    private const DETAILS = [
        'neeyung' => [
            'tagline' => 'เข้าใจน้ำรอบบ้าน พร้อมรับมือ ทั่วประเทศไทย',
            'description' => "แผนที่ติดตามสถานการณ์น้ำทั่วประเทศไทย ปักหมุดบ้านหรือพื้นที่ที่ห่วง แล้วดูปัจจัยเรื่องน้ำรอบตัวทั้งค่าจริงและค่าพยากรณ์\n\nช่วยให้ตัดสินใจได้เร็วขึ้นว่าควรเตรียมรับมือ หรือถึงเวลาต้องหนีแล้ว",
        ],
        'pliew' => [
            'tagline' => 'เรียนดนตรีออนไลน์ฟรี กีตาร์ เบส คีย์บอร์ด กลอง ทีละขั้น',
            'description' => "คอร์สเรียนดนตรีออนไลน์ฟรี 104 บทเรียน ครอบคลุมกีตาร์ เบส คีย์บอร์ด/เปียโน และกลอง\n\nเรียนทีละขั้นตั้งแต่พื้นฐานจนเล่นเพลงได้จริง",
            'category' => 'Web App',
        ],
        'staffix' => [
            'tagline' => 'ตั้งแต่ลงเวลาเข้างานจนถึงสลิปเงินเดือน',
            'description' => "ระบบบริหารงานบุคคลครบวงจร พนักงานลงเวลาผ่านแอปด้วย GPS และสแกนใบหน้า\n\nจัดตารางงาน ส่งคำขอลา OT และเลื่อนเวลา ไปจนถึงคำนวณและออกสลิปเงินเดือน",
        ],
        'art-of-life' => [
            'tagline' => 'ออกแบบชีวิตเป็นเฟสต่าง ๆ แล้วตรวจสอบกับความเป็นจริง',
        ],
        'chat' => [
            'title' => ['Chat', 'Staycool Inbox'],
            'tagline' => 'รวมทุกบทสนทนา ดูแลลูกค้าได้ใกล้กันกว่าเดิม',
            'description' => "กล่องข้อความรวมแชทจาก LINE OA และ Facebook Messenger ของ Staycool ไว้ในที่เดียว\n\nทีมตอบลูกค้าได้จากหน้าจอเดียว ไม่ต้องสลับหลายแอป",
        ],
        'aed-iot' => [
            'title' => ['AED IoT', 'Smart AED IoT'],
            'tagline' => 'ระบบติดตามเครื่อง AED อัจฉริยะแบบเรียลไทม์',
            'description' => "Cloud platform สำหรับติดตามและบริหารจัดการเครื่องกระตุกหัวใจไฟฟ้าอัตโนมัติ (AED) ผ่าน IoT Smart Cover Sensor\n\nติดตามสถานะแบบเรียลไทม์ผ่าน MQTT และ REST API แสดงพื้นที่ครอบคลุมและพื้นที่เสี่ยงบนแผนที่ แจ้งเตือนเหตุสำคัญอัตโนมัติทางอีเมลและ web notification รองรับหลายองค์กรพร้อม audit log",
            'tech_stack' => ['IoT', 'MQTT', 'REST API', 'Laravel'],
        ],
    ];

    public function up(): void
    {
        foreach (self::DETAILS as $slug => $fields) {
            $project = DB::table('projects')->where('slug', $slug)->first();
            if (! $project) {
                continue;
            }
            $update = [];
            if (isset($fields['title']) && $project->title === $fields['title'][0]) {
                $update['title'] = $fields['title'][1];
            }
            foreach (['tagline', 'description'] as $key) {
                if (isset($fields[$key]) && blank($project->{$key})) {
                    $update[$key] = $fields[$key];
                }
            }
            // tech stack ตั้งต้นของ seeder เป็นค่าเดาสั้น ๆ — แทนเฉพาะเมื่อยังเป็นค่านั้น
            if (isset($fields['tech_stack']) && in_array($project->tech_stack, ['["Laravel"]', '["IoT","PHP"]', '["PHP"]', null], true)) {
                $update['tech_stack'] = json_encode($fields['tech_stack']);
            }
            if ($update) {
                DB::table('projects')->where('id', $project->id)->update($update + ['updated_at' => now()]);
            }
        }
    }

    public function down(): void
    {
        // ข้อมูลเนื้อหา — ไม่ย้อนกลับ
    }
};
