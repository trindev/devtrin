<?php

namespace App\Models;

use App\Support\Media;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Project extends Model
{
    /** สถานะที่แสดงเป็นป้ายบนหน้าเว็บ */
    public const STATUSES = [
        'live' => 'ใช้งานจริง',
        'beta' => 'ทดลองใช้',
        'building' => 'กำลังพัฒนา',
        'archived' => 'เก็บถาวร',
    ];

    protected $fillable = [
        'title', 'slug', 'tagline', 'description', 'url', 'repo_url', 'category', 'tech_stack',
        'year', 'status', 'accent', 'cover_path', 'is_featured', 'is_published', 'sort_order',
    ];

    protected $casts = [
        'tech_stack' => 'array',
        'is_featured' => 'boolean',
        'is_published' => 'boolean',
        'year' => 'integer',
        'sort_order' => 'integer',
    ];

    protected $appends = ['cover_url', 'host'];

    protected static function booted(): void
    {
        static::creating(function (Project $project) {
            $project->slug = $project->slug ?: static::uniqueSlug($project->title);
            $project->sort_order = $project->sort_order ?: (int) static::max('sort_order') + 1;
        });

        static::deleting(function (Project $project) {
            Media::delete($project->cover_path);
            $project->images->each(fn (ProjectImage $image) => Media::delete($image->path));
        });
    }

    public static function uniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title) ?: 'project';
        $slug = $base;
        for ($i = 2; static::where('slug', $slug)->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))->exists(); $i++) {
            $slug = "{$base}-{$i}";
        }

        return $slug;
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProjectImage::class)->orderBy('sort_order')->orderBy('id');
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }

    public function getCoverUrlAttribute(): ?string
    {
        return Media::url($this->cover_path);
    }

    /** ชื่อโดเมนสั้น ๆ ไว้แสดง เช่น staycool.devtrin.com */
    public function getHostAttribute(): ?string
    {
        return $this->url ? (parse_url($this->url, PHP_URL_HOST) ?: $this->url) : null;
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }
}
