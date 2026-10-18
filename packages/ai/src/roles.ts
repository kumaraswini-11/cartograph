/**
 * The roles a model may give a file no adapter identified (spec 009,
 * FR-009). None is a surface role: those decide the routes table and the
 * tiers, and convention owns them (C-02, `002`). The database refuses any
 * other value too.
 */
export const INFERRED_ROLES = [
  "service",
  "data access",
  "model",
  "utility",
  "configuration",
  "component",
  "hook",
] as const

export type InferredRole = (typeof INFERRED_ROLES)[number]
