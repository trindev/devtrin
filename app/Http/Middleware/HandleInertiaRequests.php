<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use App\Support\AppVersion;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'is_admin' => $user->is_admin] : null,
            ],
            'site' => fn () => Setting::values(),
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'app' => ['version' => AppVersion::version()],
        ];
    }
}
