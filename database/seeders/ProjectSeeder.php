<?php

namespace Database\Seeders;

use App\Models\Project;
use Illuminate\Database\Seeder;

/**
 * โปรเจกต์ตั้งต้นจาก subdomain ที่มีอยู่บน devtrin.com — แก้ข้อความ/ใส่รูปต่อได้ที่ /admin/projects
 * รันซ้ำได้: ข้ามโปรเจกต์ที่มี slug อยู่แล้ว ไม่ทับสิ่งที่แก้ในหลังบ้าน
 */
class ProjectSeeder extends Seeder
{
    public function run(): void
    {
        $projects = [
            ['staycool', 'Staycool Pet Hotel', 'ระบบจัดการโรงแรมสัตว์เลี้ยงครบวงจร จองผ่าน LINE ได้ทันที',
                "ระบบหลังบ้านและหน้าจองสำหรับโรงแรมสัตว์เลี้ยง ลูกค้าเข้าสู่ระบบด้วย LINE จัดการข้อมูลสัตว์เลี้ยง อัปโหลดสมุดวัคซีน และจองห้องพักได้เอง\n\nฝั่งแอดมินจัดการการจอง อนุมัติวัคซีน ดูรายงานรายได้ พร้อมระบบรถรับส่ง (Pet Taxi) และแจ้งเตือนผ่าน LINE / Discord อัตโนมัติ",
                'Web App', ['Laravel 12', 'Livewire', 'React', 'LINE Login', 'MySQL'], '#16a3a3', true],
            ['law-quest', 'LawQuest', 'เรียนกฎหมายให้สนุกเหมือนเล่นเกม',
                "เกมฝึกกฎหมายไทยจากคดีจำลองที่สร้างด้วย AI ผู้เล่นตัดสินคดี เก็บแต้ม เลื่อนระดับ และทบทวนมาตราที่เกี่ยวข้อง\n\nข้อมูลตัวบทอัปเดตอัตโนมัติจาก scraper มีระบบสมาชิก Premium ผ่าน Stripe และติดตั้งเป็นแอปบนมือถือได้ (PWA)",
                'Web App', ['Laravel 12', 'React', 'Inertia', 'AI', 'Stripe', 'PWA'], '#2546c8', true],
            ['raya', 'Raya · ระยะ', 'แอปพยากรณ์รอบเดือนและร่างกาย ใช้งานออฟไลน์ได้',
                "แอปติดตามและพยากรณ์รอบเดือน แสดงช่วงเวลาสำคัญของร่างกายแบบเข้าใจง่าย ข้อมูลแยกรายบุคคลหลังเข้าสู่ระบบด้วย Google\n\nทำงานเป็น PWA ติดตั้งบนมือถือและใช้งานออฟไลน์ได้",
                'PWA', ['Laravel 12', 'React 19', 'Vite', 'PWA', 'Google OAuth'], '#e0567a', true],
            ['admin', 'Staycool Admin', 'แดชบอร์ดผู้ดูแล รวมแชท LINE และ Messenger ไว้ที่เดียว',
                "แดชบอร์ดสำหรับทีม Staycool ใช้โค้ดชุดเดียวทั้งบนเว็บ PWA และแอป Android\n\nมี Inbox รวมแชทจาก LINE OA และ Facebook Messenger พร้อมบอกได้ทันทีว่าผู้ทักเป็นลูกค้าแล้วหรือยัง",
                'Mobile App', ['React', 'Vite', 'Capacitor', 'Laravel 12', 'PWA'], '#f59e0b', false],
            ['neeyung', 'หนียัง · NeeYung', null, null, 'Web App', ['Laravel'], '#22c55e', false],
            ['pliew', 'Pliew', null, null, 'Web App', ['Laravel'], '#ef4444', false],
            ['staffix', 'Staffix', null, null, 'Web App', ['Laravel'], '#3b82f6', false],
            ['art-of-life', 'Art of Life', null, null, 'Web App', ['Laravel'], '#a855f7', false],
            ['chat', 'Chat', null, null, 'Web App', ['Laravel'], '#06b6d4', false],
            ['aed-iot', 'AED IoT', null, null, 'IoT', ['IoT', 'PHP'], '#f43f5e', false],
            ['pm', 'PM', null, null, 'Web App', ['PHP'], '#64748b', false],
            ['trin', 'Trin', null, null, 'Web App', ['Laravel'], '#eab308', false],
        ];

        foreach ($projects as $i => [$sub, $title, $tagline, $description, $category, $tech, $accent, $featured]) {
            Project::firstOrCreate(['slug' => $sub], [
                'title' => $title,
                'tagline' => $tagline,
                'description' => $description,
                'url' => "https://{$sub}.devtrin.com",
                'category' => $category,
                'tech_stack' => $tech,
                'status' => 'live',
                'accent' => $accent,
                'is_featured' => $featured,
                'is_published' => true,
                'sort_order' => $i + 1,
            ]);
        }
    }
}
