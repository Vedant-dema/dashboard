/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional absolute API origin (e.g. production). Dev: leave unset to use Vite `/api` proxy. */
  readonly VITE_API_BASE_URL?: string;
}
