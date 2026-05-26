import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Pull every VITE_* / generic env var out of .env, .env.local, etc. so we
  // can use them when configuring the dev server proxy below.
  const env = loadEnv(mode, process.cwd(), '')
  const imagesApiUrl = env.VITE_IMAGES_API_URL || ''

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://0.0.0.0:5001',
          changeOrigin: true,
          secure: false,

          ws: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (_proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        },
        // Browser → /image-api/image is same-origin, so no CORS preflight is
        // emitted. Vite forwards it server-to-server to the upstream image
        // service (configured via VITE_IMAGES_API_URL in .env). The
        // matching rewrite in vercel.json keeps prod consistent.
        ...(imagesApiUrl
          ? {
              '/image-api': {
                target: imagesApiUrl,
                changeOrigin: true,
                secure: true,
                rewrite: (p: string) => p.replace(/^\/image-api/, ''),
              },
            }
          : {}),
      },
    },
  }
})
