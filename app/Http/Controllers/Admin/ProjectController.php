<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Support\Media;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Projects/Index', [
            'projects' => Project::ordered()->withCount('images')->get(),
            'statuses' => Project::STATUSES,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Projects/Form', [
            'project' => null,
            'statuses' => Project::STATUSES,
            'categories' => $this->categories(),
            'techSuggestions' => $this->techSuggestions(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        $project = DB::transaction(function () use ($request, $data) {
            $project = Project::create($data);
            $this->syncMedia($request, $project);

            return $project;
        });

        return redirect()->route('admin.projects.edit', $project)->with('success', "เพิ่มโปรเจกต์ \"{$project->title}\" แล้ว");
    }

    public function edit(Project $project): Response
    {
        return Inertia::render('Admin/Projects/Form', [
            'project' => $project->load('images'),
            'statuses' => Project::STATUSES,
            'categories' => $this->categories(),
            'techSuggestions' => $this->techSuggestions(),
        ]);
    }

    public function update(Request $request, Project $project): RedirectResponse
    {
        $data = $this->validated($request, $project);

        DB::transaction(function () use ($request, $project, $data) {
            $project->update($data);
            $this->syncMedia($request, $project);
        });

        return redirect()->route('admin.projects.edit', $project)->with('success', 'บันทึกแล้ว');
    }

    public function destroy(Project $project): RedirectResponse
    {
        $title = $project->title;
        $project->delete();

        return redirect()->route('admin.projects.index')->with('success', "ลบ \"{$title}\" แล้ว");
    }

    /** เปิด/ปิดการแสดงผล หรือการปักหมุด จากหน้ารายการ */
    public function toggle(Request $request, Project $project): RedirectResponse
    {
        $field = $request->validate(['field' => ['required', Rule::in(['is_published', 'is_featured'])]])['field'];
        $project->update([$field => ! $project->{$field}]);

        $message = $field === 'is_published'
            ? ($project->is_published ? "แสดง \"{$project->title}\" บนหน้าเว็บแล้ว" : "ซ่อน \"{$project->title}\" จากหน้าเว็บแล้ว")
            : ($project->is_featured ? "ตั้ง \"{$project->title}\" เป็นผลงานเด่นแล้ว" : "เอา \"{$project->title}\" ออกจากผลงานเด่นแล้ว");

        return back()->with('success', $message);
    }

    public function reorder(Request $request): RedirectResponse
    {
        $ids = $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']])['ids'];

        DB::transaction(function () use ($ids) {
            foreach (array_values($ids) as $i => $id) {
                Project::whereKey($id)->update(['sort_order' => $i + 1]);
            }
        });

        return back()->with('success', 'บันทึกลำดับแล้ว');
    }

    private function validated(Request $request, ?Project $project = null): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'slug' => ['nullable', 'string', 'max:120', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('projects', 'slug')->ignore($project?->id)],
            'tagline' => ['nullable', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:20000'],
            'url' => ['nullable', 'url:http,https', 'max:255'],
            'repo_url' => ['nullable', 'url:http,https', 'max:255'],
            'category' => ['nullable', 'string', 'max:60'],
            'tech_stack' => ['nullable', 'array', 'max:20'],
            'tech_stack.*' => ['string', 'max:40'],
            'year' => ['nullable', 'integer', 'min:2000', 'max:'.(now()->year + 1)],
            'status' => ['required', Rule::in(array_keys(Project::STATUSES))],
            'accent' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'is_featured' => ['boolean'],
            'is_published' => ['boolean'],
            'cover' => ['nullable', ...Media::IMAGE_RULE],
            'remove_cover' => ['boolean'],
            'images' => ['nullable', 'array', 'max:20'],
            'images.*' => Media::IMAGE_RULE,
            'remove_images' => ['nullable', 'array'],
            'remove_images.*' => ['integer'],
        ], [], [
            'title' => 'ชื่อโปรเจกต์', 'slug' => 'slug', 'url' => 'ลิงก์เว็บ', 'repo_url' => 'ลิงก์ source code',
            'cover' => 'รูปปก', 'images.*' => 'รูปในแกลเลอรี', 'accent' => 'สีประจำโปรเจกต์', 'year' => 'ปี',
        ]);

        $data['slug'] = $data['slug'] ?? null ?: Project::uniqueSlug($data['title'], $project?->id);
        $data['tech_stack'] = array_values(array_unique(array_filter(array_map('trim', $data['tech_stack'] ?? []))));
        $data['is_featured'] = $request->boolean('is_featured');
        $data['is_published'] = $request->boolean('is_published');

        return collect($data)->except(['cover', 'remove_cover', 'images', 'remove_images'])->all();
    }

    private function syncMedia(Request $request, Project $project): void
    {
        if ($request->hasFile('cover')) {
            Media::delete($project->cover_path);
            $project->update(['cover_path' => Media::store($request->file('cover'), 'projects')]);
        } elseif ($request->boolean('remove_cover') && $project->cover_path) {
            Media::delete($project->cover_path);
            $project->update(['cover_path' => null]);
        }

        if ($remove = $request->input('remove_images')) {
            $project->images()->whereKey($remove)->get()->each->delete();
        }

        $order = (int) $project->images()->max('sort_order');
        foreach ($request->file('images', []) as $file) {
            $project->images()->create(['path' => Media::store($file, 'projects/gallery'), 'sort_order' => ++$order]);
        }
    }

    private function categories(): array
    {
        return Project::query()->whereNotNull('category')->distinct()->orderBy('category')->pluck('category')->all();
    }

    private function techSuggestions(): array
    {
        return Project::pluck('tech_stack')->flatten()->filter()->unique()->sort()->values()->all();
    }
}
