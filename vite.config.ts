import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import { ROCKSOUL_GITHUB_RAW_ORIGIN } from "@rocksoul/ui"

const moonWitnessNetworkHints = (): Plugin => ({
  name: "moonwitness-network-hints",
  transformIndexHtml(html) {
    return html.replaceAll("__ROCKSOUL_RAW_ORIGIN__", ROCKSOUL_GITHUB_RAW_ORIGIN)
  },
})

export default defineConfig({
  plugins: [react(), moonWitnessNetworkHints()],
  server: {
    port: 5173,
    proxy: {
      "/api/v1/correlation": {
        target: process.env.CORRELATION_API_URL ?? "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
})
