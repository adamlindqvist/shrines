import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        VitePWA({
            // Let a new worker wait until all game windows close; never reload mid-game.
            registerType: 'prompt',
            injectRegister: 'script',
            includeAssets: ['favicon.png', 'apple-touch-icon.png'],
            manifest: {
                id: './',
                name: 'Shrines',
                short_name: 'Shrines',
                description: 'A little adventure of sunny puzzles, friendly slimes, and hidden treasure.',
                lang: 'en',
                start_url: './',
                scope: './',
                display: 'standalone',
                background_color: '#c6e4cc',
                theme_color: '#bfdcc4',
                categories: ['games'],
                icons: [
                    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                    { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,png,webmanifest}'],
                // PlayCanvas is bundled locally so the entire game works offline.
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
                cleanupOutdatedCaches: true,
                skipWaiting: false,
                clientsClaim: false
            }
        })
    ]
});
