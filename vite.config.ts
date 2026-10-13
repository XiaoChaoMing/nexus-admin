import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Nginx edge of the backend (make nxl-up-all): the admin app only calls identity's /v1 through it, same origin, no CORS.
  const gateway = env.VITE_DEV_GATEWAY_URL || process.env.VITE_DEV_GATEWAY_URL || 'http://localhost:8080'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      rolldownOptions: {
        output: {
          // Long-lived vendor chunks: they change rarely, so browsers keep them cached across deploys.
          codeSplitting: {
            groups: [
              { name: 'react', test: /[\\/]node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/ },
              { name: 'i18n', test: /[\\/]node_modules[\\/](i18next|react-i18next|i18next-browser-languagedetector)[\\/]/ },
              { name: 'radix', test: /[\\/]node_modules[\\/](radix-ui|@radix-ui[\\/][^\\/]+)[\\/]/ },
            ],
          },
        },
      },
    },
    server: {
      // 5173 is the user web app; the admin console runs beside it.
      port: 5174,
      strictPort: true,
      proxy: {
        '/v1': { target: gateway, changeOrigin: true },
      },
    },
    preview: { port: 4174 },
  }
})
