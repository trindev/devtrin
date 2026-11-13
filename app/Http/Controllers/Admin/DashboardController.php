<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\Doctor;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Admin/Dashboard', [
            'counts' => [
                'total' => Project::count(),
                'published' => Project::published()->count(),
                'featured' => Project::published()->where('is_featured', true)->count(),
                'no_cover' => Project::published()->whereNull('cover_path')->count(),
            ],
            'recent' => Project::latest('updated_at')->take(5)->get(),
            'alerts' => Doctor::adminAlerts(),
        ]);
    }
}
