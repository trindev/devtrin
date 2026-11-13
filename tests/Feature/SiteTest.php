<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SiteTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->is_admin = true;
        $user->save();

        return $user;
    }

    private function projectData(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Staycool Pet Hotel',
            'tagline' => 'ระบบโรงแรมสัตว์เลี้ยง',
            'url' => 'https://staycool.devtrin.com',
            'category' => 'Web App',
            'tech_stack' => ['Laravel', 'React'],
            'status' => 'live',
            'accent' => '#16a3a3',
            'is_published' => '1',
            'is_featured' => '0',
        ], $overrides);
    }

    public function test_home_shows_only_published_projects_in_order(): void
    {
        Project::create(['title' => 'B', 'sort_order' => 2]);
        Project::create(['title' => 'A', 'sort_order' => 1]);
        Project::create(['title' => 'Hidden', 'is_published' => false]);

        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Home')
            ->has('projects', 2)
            ->where('projects.0.title', 'A')
            ->where('stats.projects', 2));
    }

    public function test_home_renders_meta_tags_for_crawlers(): void
    {
        Setting::put(['seo_description' => 'คำอธิบายสำหรับ Google']);

        $this->get('/')->assertOk()->assertSee('<meta name="description" content="คำอธิบายสำหรับ Google">', false);
    }

    public function test_project_page_and_hidden_project(): void
    {
        $project = Project::create(['title' => 'Law Quest']);
        $hidden = Project::create(['title' => 'Secret', 'is_published' => false]);

        $this->get('/projects/law-quest')->assertOk()->assertInertia(fn (Assert $page) => $page->component('ProjectShow')->where('project.id', $project->id));
        $this->get("/projects/{$hidden->slug}")->assertNotFound();
        $this->actingAs($this->admin())->get("/projects/{$hidden->slug}")->assertOk();
    }

    public function test_admin_requires_login_and_admin_flag(): void
    {
        $this->get('/admin')->assertRedirect('/admin/login');
        $this->actingAs(User::factory()->create())->get('/admin')->assertForbidden();
        $this->actingAs($this->admin())->get('/admin')->assertOk();
    }

    public function test_login_rejects_non_admin(): void
    {
        User::factory()->create(['email' => 'user@test.dev', 'password' => 'secret-password']);

        $this->post('/admin/login', ['email' => 'user@test.dev', 'password' => 'secret-password'])->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_admin_can_log_in(): void
    {
        $admin = $this->admin();

        $this->post('/admin/login', ['email' => $admin->email, 'password' => 'password'])->assertRedirect('/admin');
        $this->assertAuthenticatedAs($admin);
    }

    public function test_admin_creates_project_with_cover_and_gallery(): void
    {
        Storage::fake('public');

        $this->actingAs($this->admin())->post('/admin/projects', $this->projectData([
            'cover' => UploadedFile::fake()->image('cover.png', 1600, 1000),
            'images' => [UploadedFile::fake()->image('a.jpg'), UploadedFile::fake()->image('b.webp')],
        ]))->assertRedirect('/admin/projects/staycool-pet-hotel/edit');

        $project = Project::firstWhere('slug', 'staycool-pet-hotel');
        $this->assertSame(['Laravel', 'React'], $project->tech_stack);
        $this->assertNotNull($project->cover_path);
        Storage::disk('public')->assertExists($project->cover_path);
        $this->assertCount(2, $project->images);
        $this->assertStringStartsWith('/media/projects/', $project->cover_url);
    }

    public function test_media_route_serves_uploads_and_blocks_traversal(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('projects/x.png', 'png');

        $this->get('/media/projects/x.png')->assertOk();
        $this->get('/media/projects/missing.png')->assertNotFound();
        $this->get('/media/../.env')->assertNotFound();
        $this->get('/media/projects/%2e%2e/%2e%2e/.env')->assertNotFound();
    }

    public function test_update_replaces_cover_removes_gallery_and_deletes_files(): void
    {
        Storage::fake('public');
        $admin = $this->admin();
        $this->actingAs($admin)->post('/admin/projects', $this->projectData([
            'cover' => UploadedFile::fake()->image('cover.png'),
            'images' => [UploadedFile::fake()->image('a.jpg')],
        ]));
        $project = Project::first();
        $oldCover = $project->cover_path;
        $image = $project->images->first();

        $this->actingAs($admin)->post("/admin/projects/{$project->slug}", $this->projectData([
            '_method' => 'put',
            'slug' => 'staycool',
            'cover' => UploadedFile::fake()->image('new.png'),
            'remove_images' => [$image->id],
        ]))->assertRedirect('/admin/projects/staycool/edit');

        $project->refresh();
        Storage::disk('public')->assertMissing($oldCover);
        Storage::disk('public')->assertMissing($image->path);
        Storage::disk('public')->assertExists($project->cover_path);
        $this->assertCount(0, $project->images);

        $this->actingAs($admin)->delete('/admin/projects/staycool')->assertRedirect('/admin/projects');
        Storage::disk('public')->assertMissing($project->cover_path);
    }

    public function test_validation_rejects_bad_input(): void
    {
        $this->actingAs($this->admin())->post('/admin/projects', $this->projectData([
            'title' => '',
            'url' => 'javascript:alert(1)',
            'accent' => 'red',
            'cover' => UploadedFile::fake()->create('evil.php', 10, 'application/x-php'),
        ]))->assertSessionHasErrors(['title', 'url', 'accent', 'cover']);
    }

    public function test_toggle_and_reorder(): void
    {
        $admin = $this->admin();
        $a = Project::create(['title' => 'A']);
        $b = Project::create(['title' => 'B']);

        $this->actingAs($admin)->patch("/admin/projects/{$a->slug}/toggle", ['field' => 'is_featured'])->assertRedirect();
        $this->assertTrue($a->fresh()->is_featured);
        $this->actingAs($admin)->patch("/admin/projects/{$a->slug}/toggle", ['field' => 'title'])->assertSessionHasErrors('field');

        $this->actingAs($admin)->post('/admin/projects/reorder', ['ids' => [$b->id, $a->id]]);
        $this->assertSame(['B', 'A'], Project::ordered()->pluck('title')->all());
    }

    public function test_settings_are_saved_and_shared(): void
    {
        $this->actingAs($this->admin())->put('/admin/settings', [
            'site_name' => 'Devtrin',
            'hero_title' => 'หัวข้อใหม่',
            'email' => 'hello@devtrin.com',
        ])->assertSessionHasNoErrors();

        $this->get('/')->assertInertia(fn (Assert $page) => $page->where('site.hero_title', 'หัวข้อใหม่')->where('site.email', 'hello@devtrin.com'));
    }

    public function test_account_password_change_requires_current_password(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->put('/admin/account', ['name' => 'T', 'email' => $admin->email, 'current_password' => 'wrong', 'password' => 'new-password-123', 'password_confirmation' => 'new-password-123'])
            ->assertSessionHasErrors('current_password');
        $this->actingAs($admin)->put('/admin/account', ['name' => 'T', 'email' => $admin->email, 'current_password' => 'password', 'password' => 'new-password-123', 'password_confirmation' => 'new-password-123'])
            ->assertSessionHasNoErrors();
    }

    public function test_bulk_cover_upload_matches_files_by_slug(): void
    {
        Storage::fake('public');
        $staycool = Project::create(['title' => 'Staycool', 'slug' => 'staycool']);
        $raya = Project::create(['title' => 'Raya', 'slug' => 'raya']);

        $this->actingAs($this->admin())->post('/admin/projects/covers', ['covers' => [
            UploadedFile::fake()->image('staycool.webp'),
            UploadedFile::fake()->image('RAYA.png'),
            UploadedFile::fake()->image('unknown.jpg'),
        ]])->assertSessionHas('success', fn ($m) => str_contains($m, '2 โปรเจกต์') && str_contains($m, 'unknown.jpg'));

        Storage::disk('public')->assertExists($staycool->fresh()->cover_path);
        Storage::disk('public')->assertExists($raya->fresh()->cover_path);
    }
}
