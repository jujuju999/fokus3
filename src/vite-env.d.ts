/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_VAPID_PUBLIC_KEY: string
  /** 'true' shows the dev-only push test panel (see PushTest.tsx). */
  readonly VITE_ENABLE_PUSH_TEST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
