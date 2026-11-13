import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import laravel from 'laravel-vite-plugin';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: { '@': resolve(__dirname, 'resources/js') },
    },
    build: {
        rollupOptions: {
            output: {
                // แยก gsap/lenis ออกเป็นไฟล์เดียว — หน้าแอดมินไม่ต้องโหลด
                manualChunks: (id) => (id.includes('node_modules/gsap') || id.includes('node_modules/lenis') ? 'motion' : undefined),
            },
        },
    },
    server: {
        watch: { ignored: ['**/storage/framework/views/**'] },
    },
});
