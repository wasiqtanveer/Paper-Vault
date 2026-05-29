/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Pinned, not just preferred. Google sign-in sends Supabase a `redirectTo`
    // of window.location.origin, and Supabase only honours that if the exact
    // origin is in its Redirect URLs allow-list — otherwise it silently falls
    // back to the Site URL (production). A drifting port means a drifting
    // origin, which means local OAuth lands on the deployed site instead.
    // strictPort makes a busy port fail loudly rather than move.
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
  // Vitest transpiles with esbuild and needs the automatic JSX runtime so
  // source files (which don't import React) work under test. The production
  // build uses oxc and harmlessly ignores this with a one-line notice.
  esbuild: { jsx: 'automatic' },
  build: {
    rollupOptions: {
      output: {
        // Split large, rarely-changing vendors into their own cacheable chunks.
        // Vite 8 (Rolldown) requires manualChunks to be a function.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-router') || id.includes('/react/') || id.includes('/react-dom/')) {
            return 'react-vendor'
          }
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) {
            return 'framer-motion'
          }
          if (id.includes('@supabase')) return 'supabase'
        },
      },
    },
  },
})
