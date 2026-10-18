// Values the build defines (vite.config.ts) or reads from the environment
// (VITE_ variables, .env.example), typed for the app.
interface ImportMetaEnv {
  /** Production's address, set on Vercel; unset elsewhere. */
  readonly VITE_SITE_URL?: string
  /** Storage's address and publishable key, both public (.env.example). */
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  /** PostHog's project key and host, both public; unset, nothing is sent. */
  readonly VITE_POSTHOG_KEY?: string
  readonly VITE_POSTHOG_HOST?: string
  /** The build's commit on Vercel, "development" elsewhere (spec 012). */
  readonly VITE_RELEASE: string
  /** Whether the build is for Vercel, which serves Speed Insights (012). */
  readonly VITE_SPEED_INSIGHTS: boolean
}
