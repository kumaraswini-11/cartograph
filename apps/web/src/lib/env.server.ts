// Server configuration. The .server.ts name and the marker import below make
// TanStack Start refuse to import this file into the browser bundle.
import "@tanstack/react-start/server-only"

import { z } from "zod"

import { parseConfig } from "./config"

// Add each variable the server needs here, and to apps/web/.env.example.
export const serverEnvSchema = z.object({
  // Identity (spec 006). Clerk's SDK reads both itself; they're checked here
  // so a missing key stops the server when it starts. The publishable key is
  // public, sent to the browser in the page's initial state.
  VITE_CLERK_PUBLISHABLE_KEY: z
    .string()
    .regex(/^pk_(test|live)_/, "must start with pk_test_ or pk_live_"),
  CLERK_SECRET_KEY: z
    .string()
    .regex(/^sk_(test|live)_/, "must start with sk_test_ or sk_live_"),
  // Storage (spec 006; tables from 007). Requests carry the Clerk token, so
  // the publishable key is all Supabase needs, and no secret key is kept.
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .regex(/^sb_publishable_/, "must start with sb_publishable_"),
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
