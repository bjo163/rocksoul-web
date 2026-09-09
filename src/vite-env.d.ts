/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AWS_API_URL?: string
  readonly VITE_CORRELATION_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
