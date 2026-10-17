// The limits on reading a repository (spec 008 and its plan's thresholds).

/**
 * The largest archive downloaded, in bytes (spec 008, FR-009): twice the
 * largest measured, vercel/next.js at 49.9 MB.
 */
export const MAX_ARCHIVE_BYTES = 100 * 1000 * 1000

/**
 * The most an archive may unpack to, in bytes (plan D-03): under the 500 MB
 * of temporary disk a Vercel function has, leaving room for its own files.
 * Stops a small archive that unpacks into a huge one.
 */
export const MAX_EXTRACTED_BYTES = 400 * 1000 * 1000

/**
 * How long a download may take, start to finish, in milliseconds. Leaves
 * most of a run's 300 s for parsing.
 */
export const DOWNLOAD_TIMEOUT_MS = 120_000
