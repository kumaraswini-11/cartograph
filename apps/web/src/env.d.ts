// Values the build defines (vite.config.ts) or reads from the environment
// (VITE_ variables, .env.example), typed for the app.
interface ImportMetaEnv {
  /** Production's address, set on Vercel; unset elsewhere. */
  readonly VITE_SITE_URL?: string
  /** Storage's address and publishable key, both public (.env.example). */
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
}
