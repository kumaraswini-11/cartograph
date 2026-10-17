import { createGoogleGenerativeAI } from "@ai-sdk/google"
import type { LanguageModel } from "ai"

/**
 * The model every explanation is written with: an exact version, never an
 * alias that moves (spec 009, FR-012, ADR 0003). `gemini-3.6-flash` is a
 * stable name, one model (Google: stable models "point to a specific
 * stable model"); `gemini-flash-latest` is "hot-swapped with every new
 * release". Changing it changes the cache key (FR-010).
 */
export const MODEL = "gemini-3.6-flash"

/**
 * The model client, built here and nowhere else (C-04), with the key
 * passed in rather than read from the environment, so the caller's checked
 * configuration is the one source.
 */
export function languageModel(apiKey: string): LanguageModel {
  return createGoogleGenerativeAI({ apiKey })(MODEL)
}

/**
 * The model's own settings, keyed by provider, which other providers
 * ignore. A short paragraph needs little reasoning: the least thinking
 * keeps it quick, and fewer tokens count against the free tier.
 */
export const MODEL_OPTIONS = {
  google: { thinkingConfig: { thinkingLevel: "minimal" } },
}
