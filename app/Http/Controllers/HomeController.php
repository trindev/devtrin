<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Setting;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function index(): Response
    {
        $projects = Project::published()->ordered()->get();

        return Inertia::render('Home', [
            'projects' => $projects,
            'stats' => [
                'projects' => $projects->count(),
                'live' => $projects->where('status', 'live')->count(),
                'tech' => $projects->pluck('tech_stack')->flatten()->filter()->unique()->count(),
                'since' => $projects->min('year'),
            ],
        ])->withViewData(['meta' => [
            'title' => Setting::get('site_name').' — '.Setting::get('hero_title'),
            'description' => Setting::get('seo_description'),
            'image' => $projects->firstWhere('cover_url')?->cover_url,
        ]]);
    }

    public function show(Project $project): Response
    {
        abort_unless($project->is_published || auth()->user()?->is_admin, 404);
        $project->load('images');

        $list = Project::published()->ordered()->get(['id', 'slug', 'title', 'tagline', 'accent', 'cover_path', 'url']);
        $index = $list->search(fn ($p) => $p->id === $project->id);
        $next = $list->count() > 1 ? $list[($index === false ? -1 : $index + 1) % $list->count()] ?? $list->first() : null;

        return Inertia::render('ProjectShow', [
            'project' => $project,
            'next' => $next && $next->id !== $project->id ? $next : null,
            'statuses' => Project::STATUSES,
        ])->withViewData(['meta' => [
            'title' => $project->title.' — '.Setting::get('site_name'),
            'description' => $project->tagline ?: Setting::get('seo_description'),
            'image' => $project->cover_url,
        ]]);
    }
}
