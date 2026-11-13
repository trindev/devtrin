import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { registerServiceWorker } from './lib/push';

createInertiaApp({
    title: (title) => title || 'Devtrin',
    resolve: (name) => resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob('./Pages/**/*.tsx')),
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: { color: '#c8ff3d', showSpinner: false },
});

// service worker สำหรับรับแจ้งเตือน (ไม่ cache หน้าเว็บ)
registerServiceWorker();
