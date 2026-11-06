import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.BACKEND_URL ?? 'http://192.168.1.5:4000'

  return {
    plugins: [react()],
    // clone URLs point straight at the backend; git clients can't use the /api proxy
    define: { __BACKEND_URL__: JSON.stringify(backend) },
    server: {
      proxy: {
        '/api': {
          target: backend,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
