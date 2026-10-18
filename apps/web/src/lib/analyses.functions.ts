import { createServerFn } from "@tanstack/react-start"
import { listAnalyses } from "@workspace/database"
import { z } from "zod"

import {
  analysisPage,
  latestRunOf,
  rerun,
  submitAddress,
} from "./analyses.server"
import { requestStorage } from "./storage.server"

/**
 * The current organization's analyses (spec 007, FR-006): one question,
 * asked with the signed-in person's token, so the policies decide whose
 * rows come back and switching organization asks it again unchanged
 * (FR-008, C-02). Signed out, it fails before any request is made.
 */
export const getAnalyses = createServerFn({ method: "GET" }).handler(async () =>
  listAnalyses(await requestStorage())
)

/** A pasted address can be long; nothing that's an address is this long. */
const MAX_ADDRESS_LENGTH = 2000

/**
 * A repository's address submitted from the dashboard (spec 008, FR-001,
 * FR-002). POST, so the CSRF middleware checks it; the organization is the
 * session's, never the request's.
 */
export const submitRepository = createServerFn({ method: "POST" })
  .validator(z.object({ address: z.string().max(MAX_ADDRESS_LENGTH) }))
  .handler(({ data }) => submitAddress(data.address))

/** A re-run chosen from an analysis (FR-003, FR-004). */
export const rerunAnalysis = createServerFn({ method: "POST" })
  .validator(z.object({ analysisId: z.uuid() }))
  .handler(({ data }) => rerun(data.analysisId))

/** An analysis's latest run, without its map: a cheap check (plan D-11). */
export const getLatestRun = createServerFn({ method: "GET" })
  .validator(z.object({ analysisId: z.uuid() }))
  .handler(({ data }) => latestRunOf(data.analysisId))

/**
 * An analysis's page: the analysis with its latest run, and its stored map
 * once there is one (FR-010, FR-014); null when the current organization
 * has no analysis by that ID.
 */
export const getAnalysis = createServerFn({ method: "GET" })
  .validator(z.object({ analysisId: z.uuid() }))
  .handler(({ data }) => analysisPage(data.analysisId))
