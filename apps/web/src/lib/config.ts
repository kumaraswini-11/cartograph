import type { z } from "zod"

/** Configuration that is missing or invalid, with one line per value. */
export class ConfigError extends Error {
  readonly problems: ReadonlyArray<string>

  constructor(problems: ReadonlyArray<string>) {
    super(
      `Configuration is missing or invalid:\n${problems.map((p) => `  - ${p}`).join("\n")}`
    )
    this.name = "ConfigError"
    this.problems = problems
  }
}

/**
 * Reads configuration from `source` (usually `process.env`) against
 * `schema`. A value that is present but empty counts as missing.
 *
 * Throws a ConfigError naming every missing or invalid value at once, so a
 * misconfigured server stops when it starts (spec 000, FR-011) instead of
 * failing later with an error that points somewhere else.
 */
export function parseConfig<TSchema extends z.ZodObject>(
  schema: TSchema,
  source: Readonly<Record<string, string | undefined>>
): z.infer<TSchema> {
  const present = Object.fromEntries(
    Object.entries(source).filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined && entry[1].trim() !== ""
    )
  )

  const result = schema.safeParse(present)
  if (result.success) return result.data

  const problems = result.error.issues.map((issue) => {
    const name = issue.path.map(String).join(".")
    return name in present ? `${name}: ${issue.message}` : `${name} is missing`
  })
  throw new ConfigError(problems)
}
