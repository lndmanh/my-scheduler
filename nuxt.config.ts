import { APP_MANIFEST } from './app/constants/manifest';
import { routeRules } from './shared/apiRoutes';

export default defineNuxtConfig({
  modules: [
    'shadcn-nuxt',
    '@vueuse/nuxt',
    '@nuxt/fonts',
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@vite-pwa/nuxt',
    '@nuxtjs/device',
    '@nuxthub/core',
    'nuxt-auth-utils',
    '@nuxtjs/color-mode',
    'nuxt-security',
    '@vee-validate/nuxt',
  ],

  $production: {
    pwa: {
      // Use injectManifest for full control over the service worker.
      // This is required for SSR apps to properly handle offline fallbacks
      // (generateSW cannot add a setCatchHandler for navigation requests).
      strategies: 'injectManifest',
      registerType: 'autoUpdate',
      minify: true,
      manifest: APP_MANIFEST,
      srcDir: 'service-worker',
      filename: 'sw.ts',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 4000000,
        globPatterns: ['**/*.{js,css,html,svg,ico,woff2}'],
        additionalManifestEntries: [
          { url: '/pwa', revision: null },
          { url: '/~offline', revision: null },
        ],
      },
    },
  },

  devtools: {
    enabled: true,

    timeline: {
      enabled: true,
    },
  },

  app: {
    // pageTransition: { name: 'page', mode: 'out-in' }, currently disabled because sometimes page transitions can cause issues with the page not loading properly, especially when navigating between pages with different layouts.
    head: {
      title: APP_MANIFEST.name,
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', href: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },
  css: ['~/assets/css/tailwind.css', '~/assets/css/global.css'],

  site: {
    url: 'uet.nnsvn.me',
    name: APP_MANIFEST.name,
  },

  colorMode: {
    preference: 'system', // default value of $colorMode.preference
    fallback: 'light', // fallback value if not system preference found
    classSuffix: '',
    storage: 'cookie',
    disableTransition: true,
  },

  runtimeConfig: {
    public: {
      version: process.env.npm_package_version || '0.0.0',
      url: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    },
    session: {
      password: '',
      // Without maxAge the session cookie is written with no Expires, so it only
      // lives as long as the browsing session. Desktop browsers keep (and restore)
      // that, but mobile browsers and the standalone PWA drop it every time the OS
      // kills the process, logging mobile users out constantly.
      // Counted from login, not from last activity: h3 never refreshes createdAt,
      // so this is an absolute lifetime rather than a sliding window.
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  },

  routeRules: routeRules,

  compatibilityDate: '2026-01-30',
  nitro: {
    compressPublicAssets: true,
    minify: true,
    preset: 'cloudflare-module',
    experimental: {
      openAPI: true,
      wasm: true,
      tasks: true,
    },

    wasm: {
      esmImport: true,
      lazy: true,
      silent: true,
    },
    rollupConfig: {
      external: ['sharp', /^@img\/sharp.*/],
      output: {
        generatedCode: {
          constBindings: true,
        },
      },
    },
    cloudflare: {
      // deployConfig writes the merged binding spec to
      // .output/server/wrangler.json at build time — the SINGLE source of
      // truth for the Worker config; there is no hand-maintained
      // wrangler.json. Deploy: wrangler deploy --config .output/server/wrangler.json
      deployConfig: true,
      nodeCompat: true,
      wrangler: {
        compatibility_date: '2026-06-16',
        compatibility_flags: ['nodejs_compat'],
        workers_dev: false,
        observability: {
          logs: { enabled: true, invocation_logs: true },
        },
        routes: [{ pattern: 'uet.nnsvn.me', custom_domain: true }],
        triggers: {
          crons: ['0 * * * *'],
        },
      },
    },
    typescript: {
      tsConfig: {
        exclude: ['**/dist/**', '**/node_modules/**'],
      },
    },
  },

  hub: {
    // D1 database
    db: 'sqlite',
    // KV namespace (binding defaults to 'KV')
    kv: false,
    // Cache KV namespace (binding defaults to 'CACHE')
    cache: false,
    // R2 bucket (binding defaults to 'BLOB')
    blob: false,
  },

  vite: {
    optimizeDeps: {
      include: ['clsx', 'reka-ui', 'tailwind-merge'],
    },
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        external: ['sharp'],
      },
    },
  },

  sourcemap: {
    server: true,
    client: false,
  },

  auth: {
    webAuthn: true,
  },

  fonts: {
    families: [
      {
        name: 'Manrope',
        preload: true,
        provider: 'google',
        global: true,
      },
    ],
  },
  security: {
    rateLimiter: false,
    strict: true,
    nonce: true,
    ssg: {
      hashScripts: true, // In the SSG case, inline scripts generated by the server will be allowed by hash
    },
    // MCP tool-call bodies legitimately contain component source snippets
    // ("<script setup>") that the XSS validator would reject with a 400.
    xssValidator: false,
    // SRI breaks hydration behind Cloudflare's immutable edge cache: Vite
    // injects __vite__mapDeps after content-hash naming, so a chunk filename
    // can carry different bytes across deploys and the stale cached variant
    // fails the integrity check (resource blocked, app init fails).
    sri: false,
    headers: {
      crossOriginOpenerPolicy: 'same-origin-allow-popups',
      crossOriginEmbedderPolicy: 'unsafe-none',
      contentSecurityPolicy: {
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'script-src': [
          "'self'",
          'https:',
          "'unsafe-inline'",
          "'strict-dynamic'",
          "'nonce-{{nonce}}'",
          "'unsafe-eval'",
        ],
        'style-src': ["'self'", 'https:', "'unsafe-inline'", 'https://challenges.cloudflare.com'],
        'img-src': [
          "'self'",
          'data:',
          'blob:',
          'https://images.unsplash.com',
          'https://api.dicebear.com',
          'https://*.svc.ms',
          'https://*.google.com',
          'https://*.gstatic.com',
          'https://*.googleapis.com',
          'https://*.picsum.photos',
        ],
        'media-src': ["'self'", 'blob:', 'https://*.svc.ms'],
        'connect-src': [
          "'self'",
          'https://translate-pa.googleapis.com',
          'https://*.svc.ms',
          'https://*.sentry.io',
          'https://challenges.cloudflare.com',
          'https://api.iconify.design',
          'https://api.simplesvg.com',
          'https://api.simplesvg.com',
          'https://api.unisvg.com',
        ],
        'font-src': ["'self'", 'https://*.gstatic.com'],
        'worker-src': ["'self'", 'blob:'],
        'frame-src': ["'self'", 'https://www.youtube.com', 'https://challenges.cloudflare.com'],
        'upgrade-insecure-requests': true,
      },
      permissionsPolicy: {
        fullscreen: ['self'],
        'picture-in-picture': ['self'],
        'publickey-credentials-get': ['self'],
        'web-share': ['self'],
        autoplay: ['self'],
        // disabled
        camera: [],
        'display-capture': [],
        geolocation: [],
        microphone: [],
      },
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubdomains: true,
        preload: true,
      },
    },
  },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },
});
