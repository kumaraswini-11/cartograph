// The session token's custom claim, set on the Clerk instance (spec 006 plan
// D-04): Clerk's types read custom claims from this global interface.
export {}

declare global {
  interface CustomJwtSessionClaims {
    /** The current organization's name, for the first paint (FR-011). */
    org_name?: string
  }
}
