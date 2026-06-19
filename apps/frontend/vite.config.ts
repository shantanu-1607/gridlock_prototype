import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
/* eslint-disable no-undef */
import path from 'path'
import { defineConfig, loadEnv } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../../'), '')

  return {
    cacheDir: './.vite-cache',
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    define: {
      'import.meta.env.VITE_MAPMYINDIA_API': JSON.stringify(env.MAPMYINDIA_API),
    },

    server: {
      host: true,
      port: 5173,
      watch: {
        usePolling: true,
      },
    },
  }
})
