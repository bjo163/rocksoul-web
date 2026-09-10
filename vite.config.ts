import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import { ROCKSOUL_GITHUB_RAW_ORIGIN } from "@rocksoul/ui"

import { cloudflare } from "@cloudflare/vite-plugin";

const moonWitnessNetworkHints = (): Plugin => ({
  name: "moonwitness-network-hints",
  transformIndexHtml(html) {
    return html.replaceAll("__ROCKSOUL_RAW_ORIGIN__", ROCKSOUL_GITHUB_RAW_ORIGIN)
  },
})

export default defineConfig({
  plugins: [react(), moonWitnessNetworkHints(), cloudflare()],
  server: {
    port: 5173,
    proxy: {
      "/public": {
        target: process.env.CORRELATION_API_URL ?? "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/api/v1/correlation": {
        target: process.env.CORRELATION_API_URL ?? "http://127.0.0.1:8787",
        changeOrigin: true,
        configure(proxy) {
          proxy.on("error", (_err, _req, res) => {
            if ("writeHead" in res && typeof res.writeHead === "function" && !res.headersSent) {
              res.writeHead(502, { "Content-Type": "application/json" })
              res.end(JSON.stringify({ error: "Backend service offline, using fallback" }))
            }
          })
        },
      },
    },
  },
})