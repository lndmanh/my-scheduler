import type { ManifestOptions } from 'vite-plugin-pwa';

export const APP_MANIFEST: Partial<ManifestOptions> = {
  name: 'My Scheduler',
  short_name: 'My Scheduler',
  description: "Le Ngo Duc Manh's personal scheduler app",
  start_url: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#8b5cf6',
  orientation: 'any',
  scope: '/',
  lang: 'en',
  categories: ['education', 'productivity'],
  icons: [
    {
      src: 'pwa-64x64.png',
      sizes: '64x64',
      type: 'image/png',
    },
    {
      src: 'pwa-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: 'pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: 'maskable-icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};

// SEO-related constants
export const SEO_CONFIG = {
  author: 'No Name Studio',
  keywords: 'nuxt, template, pwa, starter, vue, javascript',
  ogImage: '/pwa-512x512.png',
  twitterCard: 'summary_large_image' as const,
  robots: 'index, follow',
  colorScheme: 'light dark',
} as const;
