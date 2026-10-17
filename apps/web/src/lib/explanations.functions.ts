import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

import { explainSelection } from "./explanations.server"

/**
 * A file of an analysis explained (spec 009, FR-001, FR-003). POST, so the
 * CSRF middleware checks it, and it may spend a model call; the
 * organization is the session's, never the request's.
 */
export const explain = createServerFn({ method: "POST" })
  .validator(
    z.object({ analysisId: z.uuid(), path: z.string().min(1).max(1000) })
  )
  .handler(({ data }) => explainSelection(data.analysisId, data.path))
