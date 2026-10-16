// Limits the platform must provide (docs/specs/000-platform-requirements).

/**
 * The longest one server request may run, in seconds: the time a repository
 * analysis may take (spec 008). 300 is the most Vercel allows on every plan.
 */
export const MAX_RUN_SECONDS = 300
