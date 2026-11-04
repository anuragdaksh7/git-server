import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: env.BACKEND_URL ?? 'http://192.168.1.5:4000',
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
