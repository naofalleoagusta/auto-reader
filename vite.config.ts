import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        // Static landing page (no React) — kept as a separate entry so it
        // ships none of the reader app's JS.
        landing: resolve(__dirname, 'index.html'),
        // The actual reader SPA, relocated from the project root.
        app: resolve(__dirname, 'app/index.html'),
      },
      output: {
        manualChunks: {
          // Stable vendor chunk — its hash doesn't change on app-code-only
          // deploys, so repeat visitors don't re-download React each time.
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
})
