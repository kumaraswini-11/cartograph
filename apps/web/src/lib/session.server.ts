// The marker makes TanStack Start refuse to import this file into the
// browser bundle, as for env.server.ts.
import "@tanstack/react-start/server-only"

import { auth } from "@clerk/tanstack-react-start/server"

import { sessionFromClaims } from "./session"
import type { Session } from "./session"

/**
 * This request's session, from the token Clerk's middleware verified; no
 * question to Clerk (spec 006, C-01). A pending session (no organization
 * chosen yet) counts as signed out, Clerk's default.
 */
export async function readSession(): Promise<Session> {
  return sessionFromClaims(await auth())
}
