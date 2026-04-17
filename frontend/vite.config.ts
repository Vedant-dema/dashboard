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
    build: {
      rollupOptions: {
        output: {
          /** Split heavy vendors for parallel download + long cache when app code changes. */
          manualChunks(id) {
            const norm = id.split("\\").join("/");
            if (!norm.includes("node_modules")) return;
            if (norm.includes("node_modules/react-dom/")) return "react-vendors";
            if (norm.includes("node_modules/react/")) return "react-vendors";
            if (norm.includes("node_modules/scheduler/")) return "react-vendors";
            if (norm.includes("lucide-react")) return "lucide";
            if (norm.includes("react-grid-layout") || norm.includes("react-resizable")) return "grid-layout";
            if (norm.includes("recharts")) return "recharts";
            if (norm.includes("html2pdf")) return "html2pdf";
            if (norm.includes("transliteration")) return "transliteration";
          },
        },
      },
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
