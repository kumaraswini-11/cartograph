// Limits from docs/specs/001-repository-parser.

/**
 * The most files a repository may have. Over it, nothing is parsed (FR-005).
 * Depends on the platform: the most a run can fetch and parse within
 * MAX_RUN_SECONDS (spec 000); this repository's value is in the plan.
 */
export const MAX_FILES = 5_000

/** A file over this many bytes is skipped as "too large", unread (FR-003). */
export const MAX_FILE_BYTES = 1_000_000

/** Examples kept for each reason an import is unresolved (FR-019). */
export const COVERAGE_EXAMPLES = 20
