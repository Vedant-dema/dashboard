import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/** Backend URL for dev-server `/api` proxy (not baked into the client bundle). */
const DEFAULT_DEV_API = "http://127.0.0.1:8000";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = (env.VITE_DEV_PROXY_API || DEFAULT_DEV_API).replace(/\/+$/, "");

  return {
    plugins: [react()],
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    server: {
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
