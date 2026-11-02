import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

function clearaerCountPlugin() {
  const file = path.resolve(__dirname, "public/downloads/clearaer-count.json");

  const readTotal = () => {
    try {
      return Math.max(0, Number(JSON.parse(fs.readFileSync(file, "utf8")).total) || 0);
    } catch {
      return 0;
    }
  };

  const writeTotal = (total: number) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify({ total })}\n`);
  };

  return {
    name: "clearaer-count",
    configureServer(server: { middlewares: { use: Function } }) {
      server.middlewares.use((req: { method?: string; url?: string }, res: { setHeader: Function; end: Function; statusCode: number }, next: () => void) => {
        const url = req.url?.split("?")[0];
        if (url !== "/downloads/clearaer-count.json") {
          next();
          return;
        }
        if (req.method === "GET") {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ total: readTotal() }));
          return;
        }
        if (req.method === "POST") {
          const total = readTotal() + 1;
          writeTotal(total);
          res.statusCode = 201;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ status: "success", total }));
          return;
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Pull every VITE_* / generic env var out of .env, .env.local, etc. so we
  // can use them when configuring the dev server proxy below.
  const env = loadEnv(mode, process.cwd(), "");
  const imagesApiUrl = env.VITE_IMAGES_API_URL || "";

  return {
    plugins: [react(), clearaerCountPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: "http://127.0.0.1:5001",
          changeOrigin: true,
          secure: false,

          ws: true,
          configure: (proxy, _options) => {
            proxy.on("error", (err, _req, _res) => {
              console.log("proxy error", err);
            });
            proxy.on("proxyReq", (_proxyReq, req, _res) => {
              console.log(
                "Sending Request to the Target:",
                req.method,
                req.url,
              );
            });
            proxy.on("proxyRes", (proxyRes, req, res) => {
              console.log(
                "Received Response from the Target:",
                proxyRes.statusCode,
                req.url,
              );
              // Keep chat SSE frames unbuffered through the Vite proxy.
              if (req.url?.includes("/marketplace/stream") || req.url?.includes("/care/stream")) {
                res.setHeader("Cache-Control", "no-cache, no-transform");
                res.setHeader("X-Accel-Buffering", "no");
                proxyRes.headers["cache-control"] = "no-cache, no-transform";
                proxyRes.headers["x-accel-buffering"] = "no";
              }
            });
          },
        },
        // Browser → /image-api/image is same-origin, so no CORS preflight is
        // emitted. Vite forwards it server-to-server to the upstream image
        // service (configured via VITE_IMAGES_API_URL in .env). The
        // matching rewrite in vercel.json keeps prod consistent.
        ...(imagesApiUrl
          ? {
              "/image-api": {
                target: imagesApiUrl,
                changeOrigin: true,
                secure: true,
                rewrite: (p: string) => p.replace(/^\/image-api/, ""),
              },
            }
          : {}),
      },
    },
  };
});
