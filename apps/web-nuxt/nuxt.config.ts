import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8'));
const commit = process.env.commit || execSync('git rev-parse --short HEAD').toString().trim();

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: true },
  modules: ['shadcn-nuxt', '@nuxt/image', '@nuxtjs/color-mode', '@vueuse/nuxt', '@sentry/nuxt/module'],
  css: ['~/assets/css/tailwind.css'],
  build: {
    // anything that imports 'vue' must be bundled with the app: an externalized copy would load a
    // second Vue instance in production and break SSR (null currentInstance)
    transpile: [
      '@lucide/vue',
      'reka-ui',
      'vue-sonner',
      'vee-validate',
      '@vee-validate/zod',
      '@vueuse/core',
      '@vueuse/shared',
      'embla-carousel-vue',
      '@internationalized/date',
    ],
  },
  vite: {
    plugins: [tailwindcss()],
    // the dev mediamtx container calls the auth webhook as host.docker.internal; vite's host check
    // would otherwise answer 403 (production serves through nitro, which has no such check)
    server: { allowedHosts: ['host.docker.internal'] },
  },
  shadcn: { prefix: '', componentDir: '@/components/ui' },
  colorMode: { classSuffix: '', preference: 'system', fallback: 'light' },
  image: {
    domains: [
      'picsum.photos',
      'secure.gravatar.com',
      'emoji.slack-edge.com',
      'cdn.jsdelivr.net',
      'eoceqrx2r7.ufs.sh',
      'thesvg.org',
    ],
  },
  runtimeConfig: {
    liveServerUrl:
      process.env.NODE_ENV === 'production' ? 'http://nginx-rtmp:8888' : 'http://localhost:8888',
    public: {
      commit,
      version,
      mediamtxUrl: '',
      mediamtxIngestRoute: '',
    },
  },
  nitro: {
    // chat runs on Nitro's crossws integration at /api/stream/chat/ws/:username
    experimental: { websocket: true, asyncContext: true },
    externals: { external: ['bullmq', '@prisma/client', '@node-rs/argon2', 'sharp'] },
    // the CommonJS Prisma client (inlined from packages/db) expects __dirname/require, which do not
    // exist in an ES module chunk; the engine itself is located through PRISMA_QUERY_ENGINE_LIBRARY
    rollupConfig: {
      output: {
        banner:
          "import { createRequire as __hctvCreateRequire } from 'node:module';import { fileURLToPath as __hctvFileURLToPath } from 'node:url';import { dirname as __hctvDirname } from 'node:path';const require = __hctvCreateRequire(import.meta.url);const __filename = __hctvFileURLToPath(import.meta.url);const __dirname = __hctvDirname(__filename);",
      },
    },
  },
  typescript: {
    tsConfig: { compilerOptions: { noUncheckedIndexedAccess: false } },
  },
  sentry: {
    org: 'sr-izan',
    project: 'hctv',
    authToken: process.env.SENTRY_AUTH_TOKEN,
  },
});
