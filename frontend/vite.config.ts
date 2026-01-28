import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")

  // Dev server proxy target for API calls.
  // Defaults to local backend but can be overridden with VITE_DEV_API_PROXY.
  const apiProxyTarget =
    env.VITE_DEV_API_PROXY || "http://localhost:5001"

  const isDev = mode === "development"

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy, _options) => {
            if (!isDev) return

            proxy.on("error", (err, _req, _res) => {
              console.error("[proxy] error", err)
            })
            proxy.on("proxyReq", (_proxyReq, req, _res) => {
              console.log("[proxy] request:", req.method, req.url)
            })
            proxy.on("proxyRes", (proxyRes, req, _res) => {
              console.log(
                "[proxy] response:",
                proxyRes.statusCode,
                req.url
              )
            })
          },
        },
      },
    },
    build: {
      sourcemap: false,
      minify: "esbuild",
      chunkSizeWarningLimit: 1500,
    },
  }
})
