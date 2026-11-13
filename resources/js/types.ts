export type ProjectStatus = 'live' | 'beta' | 'building' | 'archived';

export interface ProjectImage {
    id: number;
    path: string;
    url: string;
    caption: string | null;
    sort_order: number;
}

export interface Project {
    id: number;
    title: string;
    slug: string;
    tagline: string | null;
    description: string | null;
    url: string | null;
    repo_url: string | null;
    category: string | null;
    tech_stack: string[] | null;
    year: number | null;
    status: ProjectStatus;
    accent: string;
    cover_path: string | null;
    cover_url: string | null;
    host: string | null;
    is_featured: boolean;
    is_published: boolean;
    sort_order: number;
    images?: ProjectImage[];
    images_count?: number;
    updated_at: string;
}

export type SiteSettings = Record<
    | 'site_name' | 'hero_eyebrow' | 'hero_title' | 'hero_subtitle' | 'about' | 'availability' | 'contact_title'
    | 'email' | 'phone' | 'line_url' | 'github_url' | 'facebook_url' | 'location' | 'seo_description',
    string
>;

export interface SharedProps {
    auth: { user: { id: number; name: string; email: string; is_admin: boolean } | null };
    site: SiteSettings;
    flash: { success: string | null; error: string | null };
    app: { version: string };
    errors: Record<string, string>;
    [key: string]: unknown;
}
