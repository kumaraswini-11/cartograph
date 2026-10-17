import { createServerFn } from "@tanstack/react-start"
import { listAnalyses } from "@workspace/database"

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
