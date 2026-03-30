/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional absolute API origin (e.g. production). Dev: leave unset to use Vite `/api` proxy. */
  readonly VITE_API_BASE_URL?: string;
  /**
   * Dev-server only (read by vite.config.ts): proxy `/api` to this origin.
   * Use when default port 8000 is blocked (e.g. Windows WinError 10013).
   */
  readonly VITE_DEV_PROXY_API?: string;
}
