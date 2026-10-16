// Server configuration. The .server.ts name and the marker import below make
// TanStack Start refuse to import this file into the browser bundle.
import "@tanstack/react-start/server-only"

import { z } from "zod"

import { parseConfig } from "./config"

// Add each variable the server needs here, and to apps/web/.env.example.
// Nothing is required yet.
const serverEnvSchema = z.object({})

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
