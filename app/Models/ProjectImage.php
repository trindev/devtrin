<?php

namespace App\Models;

use App\Support\Media;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectImage extends Model
{
    protected $fillable = ['project_id', 'path', 'caption', 'sort_order'];

    protected $appends = ['url'];

    protected static function booted(): void
    {
        static::deleting(fn (ProjectImage $image) => Media::delete($image->path));
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function getUrlAttribute(): ?string
    {
        return Media::url($this->path);
    }
}
