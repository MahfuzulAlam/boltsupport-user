/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Vite 8 resolves the @/* aliases from tsconfig.app.json natively.
  resolve: { tsconfigPaths: true },
  build: {
    // NFR-1.6 caps the initial bundle at 250KB gzipped. Route level splitting keeps the
    // entry chunk small; this warns early enough to notice a regression.
    chunkSizeWarningLimit: 700,
    sourcemap: true,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            {
              /**
               * The tiny utilities every component uses.
               *
               * They have to be claimed before anything heavier, or a big group absorbs one of
               * them and the entry chunk ends up statically importing that whole group to get
               * `cn`. That is how Recharts first arrived in the initial payload.
               */
              name: 'shared-utils',
              test: /node_modules[/\\](clsx|tailwind-merge|class-variance-authority)[/\\]/,
            },
            {
              /**
               * React first, because groups are matched in order.
               *
               * Left to itself the bundler folds React into whichever chunk first reaches it,
               * and if that is the editor chunk then every page eagerly downloads ProseMirror
               * to get React. Pinning it here keeps that chunk honest.
               */
              name: 'react-vendor',
              test: /node_modules[/\\](react|react-dom|scheduler|use-sync-external-store)[/\\]/,
            },
            {
              /**
               * The rich text stack, pinned to its own chunk.
               *
               * Two routes use it (the composer and the article editor) and neither is the
               * first screen. Without this, being shared makes it common, and common means the
               * entry chunk: 200KB of ProseMirror downloaded before the login form appears.
               */
              name: 'editor',
              test: /node_modules[/\\](@tiptap|prosemirror-|linkifyjs|orderedmap|rope-sequence|w3c-keyname)/,
            },
            {
              // Charts land the same way once the reports arrive in step 13.
              name: 'charts',
              test: /node_modules[/\\](recharts|d3-|victory-)/,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Component tests mount Tiptap, MSW, and React Query together, which comfortably exceeds
    // the 5s default once the suite runs in parallel. These are slow, not hanging: the same
    // tests pass well inside this when run on their own.
    /*
     * Half the cores, not all of them.
     *
     * Several suites mount the conversation page, which pulls Tiptap through a lazy boundary.
     * At full parallelism eight of those contend for eight cores, the dynamic import stalls,
     * and unrelated files start timing out. Fewer workers with real CPU each is both faster
     * end to end and stable.
     */
    maxWorkers: 4,
    testTimeout: 20_000,
    hookTimeout: 20_000,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['src/test/**', 'src/**/*.d.ts', 'src/mocks/**'],
    },
  },
})
