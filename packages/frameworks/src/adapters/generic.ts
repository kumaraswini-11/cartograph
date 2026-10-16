import type { Adapter } from "../adapter.ts"

/**
 * For a package no adapter recognises (spec 002, FR-003): every file is
 * Unidentified, with no framework entry points and no routes.
 */
export const genericAdapter: Adapter = {
  taxonomy: undefined,
  recognises: () => true,
  describe: () => ({ roles: new Map(), entryPoints: new Set(), routes: [] }),
}
