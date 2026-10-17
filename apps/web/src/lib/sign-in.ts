// Where signing in happens and where it leads (spec 006, FR-002, FR-008),
// read by the middleware, the provider and the protected layout.

/** The sign-in page; it signs up too, and accepts an invitation's ticket. */
export const SIGN_IN_PATH = "/sign-in"

/** Where every sign-in lands, whichever method (FR-002). */
export const AFTER_SIGN_IN_PATH = "/dashboard"
