<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('Admin/Settings', ['values' => Setting::values()]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'site_name' => ['required', 'string', 'max:60'],
            'hero_eyebrow' => ['nullable', 'string', 'max:120'],
            'hero_title' => ['required', 'string', 'max:160'],
            'hero_subtitle' => ['nullable', 'string', 'max:400'],
            'about' => ['nullable', 'string', 'max:3000'],
            'availability' => ['nullable', 'string', 'max:60'],
            'contact_title' => ['nullable', 'string', 'max:160'],
            'email' => ['nullable', 'email', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40'],
            'line_url' => ['nullable', 'url:http,https', 'max:255'],
            'github_url' => ['nullable', 'url:http,https', 'max:255'],
            'facebook_url' => ['nullable', 'url:http,https', 'max:255'],
            'location' => ['nullable', 'string', 'max:120'],
            'seo_description' => ['nullable', 'string', 'max:300'],
        ]);
        Setting::put($data);

        return back()->with('success', 'บันทึกการตั้งค่าแล้ว');
    }
}
