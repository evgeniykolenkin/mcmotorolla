import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        // Supabase тянет заметный кусок — выносим его отдельным чанком,
        // чтобы кэшировался независимо от кода приложения.
        manualChunks: {
          supabase: ['@supabase/supabase-js'],
          vue: ['vue', 'vue-router']
        }
      }
    }
  }
})
