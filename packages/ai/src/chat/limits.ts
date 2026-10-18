// The chat's limits (spec 010, plan Thresholds), one source for each.

/** The most lookups one question makes (FR-005). */
export const MAX_LOOKUPS = 12

/** The most model calls one question makes: lookup rounds, then the answer. */
export const MAX_STEPS = 6

/** The most paths of one list the model is handed; the rest are counted. */
export const MODEL_LIST_LIMIT = 50

/** The most earlier questions, with their answers, sent with a new one. */
export const KEPT_QUESTIONS = 4
