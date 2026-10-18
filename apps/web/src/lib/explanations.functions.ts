import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

import { explainSelection, stalenessOf } from "./explanations.server"

/** What to explain: a file by its path, or a box by its folder. */
const subjectSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("file"), path: z.string().min(1).max(1000) }),
  // A box's id is its folder: "" for the repository's root.
  z.object({ kind: z.literal("box"), path: z.string().max(1000) }),
])

/**
 * A file or box of an analysis explained (spec 009, FR-001 to FR-003).
 * POST, so the CSRF middleware checks it, and it may spend a model call;
 * the organization is the session's, never the request's.
 */
export const explain = createServerFn({ method: "POST" })
  .validator(
    z.object({
      analysisId: z.uuid(),
      subject: subjectSchema,
    })
  )
  .handler(({ data }) => explainSelection(data.analysisId, data.subject))

/**
 * Whether an explanation still matches the repository (spec 009, FR-014,
 * FR-015, plan D-10). GET: it reads, and spends no model call.
 */
export const staleness = createServerFn({ method: "GET" })
  .validator(z.object({ analysisId: z.uuid(), subject: subjectSchema }))
  .handler(({ data }) => stalenessOf(data.analysisId, data.subject))
