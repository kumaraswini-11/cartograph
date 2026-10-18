/**
 * An id's shape, as zod's `z.uuid()` accepts it (RFC 9562: a version digit
 * from 1 to 8, a variant from 8 to b, or the nil and max ids). Loaders
 * check it before asking for anything, so a mistyped address is simply not
 * found; the server functions still validate every id with zod. Kept
 * without zod, because a loader ships with every page.
 */
const UUID =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i

export const isUuid = (value: string): boolean => UUID.test(value)
