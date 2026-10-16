// Values the build defines (vite.config.ts), typed for the app.
interface ImportMetaEnv {
  /** Production's address, set on Vercel; unset elsewhere. */
  readonly VITE_SITE_URL?: string
}
