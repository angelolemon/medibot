import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    cssCodeSplit: true,
    // Raise the warning threshold a bit — the bundle is still under 600 kB raw / ~160 kB gzipped
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Manual chunking so vendor code lives in a long-lived cacheable file.
        // Keeps the app bundle smaller on each deploy.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('react-dom')) return 'vendor-react-dom'
          if (id.includes('/react/') || id.endsWith('/react')) return 'vendor-react'
          return 'vendor'
        },
      },
    },
  },
})
