import type { Adapter } from "../adapter.ts"
import { expressAdapter } from "./express/adapter.ts"
import { genericAdapter } from "./generic.ts"
import { nestjsAdapter } from "./nestjs/adapter.ts"
import { nextjsAdapter } from "./nextjs/adapter.ts"
import { reactAdapter } from "./react/adapter.ts"

/**
 * The adapters in the fixed order they run (spec 002, FR-002). The order
 * matters: a framework built on another declares both, and the first wins.
 */
export const ADAPTERS: ReadonlyArray<Adapter> = [
  nextjsAdapter,
  nestjsAdapter,
  expressAdapter,
  reactAdapter,
]

export { genericAdapter }
