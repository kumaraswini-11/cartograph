// Server configuration. The .server.ts name and the marker import below make
// TanStack Start refuse to import this file into the browser bundle.
import "@tanstack/react-start/server-only"

import { z } from "zod"

import { parseConfig } from "./config"

// Add each variable the server needs here, and to apps/web/.env.example, in
// the same groups and order, so a start-up error lists them as the file does.
export const serverEnvSchema = z
  .object({
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
    // carry their Clerk token, so the publishable key is all those need. Both
    // are public, read by the browser too, to hear a run's stages (spec 008,
    // plan D-10).
    VITE_SUPABASE_URL: z.url(),
    VITE_SUPABASE_PUBLISHABLE_KEY: z
      .string()
      .regex(/^sb_publishable_/, "must start with sb_publishable_"),
    // For the requests no person makes: deleting an organization's rows when
    // Clerk says it's gone (spec 007, D-07), and a run's writes after the
    // response (spec 008, D-06). Server only.
    SUPABASE_SECRET_KEY: z
      .string()
      .regex(/^sb_secret_/, "must start with sb_secret_"),

    // AI: the model and its tracing (spec 009). The model's key is required:
    // explanations need it. Tracing is optional, and every request works
    // without it (FR-013); turned on, it needs its key.
    GEMINI_API_KEY: z.string(),
    LANGSMITH_TRACING: z.enum(["true", "false"]).optional(),
    LANGSMITH_API_KEY: z
      .string()
      .regex(/^lsv2_/, "must start with lsv2_")
      .optional(),
    // The key goes with every trace: never over plain HTTP.
    LANGSMITH_ENDPOINT: z
      .url({ protocol: /^https$/, error: "must be an https:// address" })
      .optional(),
    LANGSMITH_PROJECT: z.string().optional(),

    // Errors and events: PostHog (spec 012). Optional: unset, nothing is
    // sent and everything works. Both public, read by the browser too: the
    // project key only writes events.
    VITE_POSTHOG_KEY: z
      .string()
      .regex(/^phc_/, "must start with phc_")
      .optional(),
    VITE_POSTHOG_HOST: z
      .url({ protocol: /^https$/, error: "must be an https:// address" })
      .optional(),
  })
  .superRefine((env, context) => {
    if (
      env.LANGSMITH_TRACING === "true" &&
      env.LANGSMITH_API_KEY === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["LANGSMITH_API_KEY"],
        message: "is needed when LANGSMITH_TRACING is true",
      })
    }
    if (
      env.VITE_POSTHOG_KEY !== undefined &&
      env.VITE_POSTHOG_HOST === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["VITE_POSTHOG_HOST"],
        message: "is needed when VITE_POSTHOG_KEY is set",
      })
    }
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
