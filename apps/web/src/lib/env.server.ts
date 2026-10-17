// Server configuration. The .server.ts name and the marker import below make
// TanStack Start refuse to import this file into the browser bundle.
import "@tanstack/react-start/server-only"

import { z } from "zod"

import { parseConfig } from "./config"

// Add each variable the server needs here, and to apps/web/.env.example, in
// the same groups and order, so a start-up error lists them as the file does.
export const serverEnvSchema = z.object({
  // Identity: Clerk (spec 006). Clerk's SDK reads its two keys itself;
  // they're checked here so a missing key stops the server when it starts.
  // The publishable key is public, sent to the browser in the page's
  // initial state.
  VITE_CLERK_PUBLISHABLE_KEY: z
    .string()
    .regex(/^pk_(test|live)_/, "must start with pk_test_ or pk_live_"),
  CLERK_SECRET_KEY: z
    .string()
    .regex(/^sk_(test|live)_/, "must start with sk_test_ or sk_live_"),
  // Proves a webhook notice is Clerk's (spec 007, plan D-07).
  CLERK_WEBHOOK_SIGNING_SECRET: z
    .string()
    .regex(/^whsec_/, "must start with whsec_"),
  // Storage: Supabase (spec 006; tables from 007). A person's requests
  // carry their Clerk token, so the publishable key is all those need.
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .regex(/^sb_publishable_/, "must start with sb_publishable_"),
  // Deleting an organization's rows when Clerk says it's gone: no person
  // asks, so the secret key, read by that webhook alone (plan D-07).
  SUPABASE_SECRET_KEY: z
    .string()
    .regex(/^sb_secret_/, "must start with sb_secret_"),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

let cached: ServerEnv | undefined

/**
 * The validated server configuration. Read it inside a server function or
 * handler, never at module scope. src/server.ts calls it once at startup, so
 * a missing value stops the server before it serves a request.
 */
export function getServerEnv(): ServerEnv {
  cached ??= parseConfig(serverEnvSchema, process.env)
  return cached
}
