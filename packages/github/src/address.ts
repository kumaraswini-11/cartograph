// What counts as a public GitHub repository's address (spec 008, FR-001).
// Pure, with no Node.js import: the form checks an address in the browser
// with the same rules the server applies. Exported at
// `@workspace/github/address`.

/** A repository as "owner/name", as the member wrote it. */
export type Repository = `${string}/${string}`

export type Address =
  | { repository: Repository }
  | { refusal: (typeof REFUSALS)[keyof typeof REFUSALS] }

/** Why an address is refused, one fixed sentence each (AC-09). */
export const REFUSALS = {
  empty: "Enter a GitHub repository's address.",
  malformed: "That isn't a web address. Try github.com/owner/name.",
  notGitHub: "Only GitHub repositories can be mapped.",
  notRepository:
    "That GitHub address isn't a repository. Try github.com/owner/name.",
} as const

const GITHUB_HOSTS: ReadonlySet<string> = new Set([
  "github.com",
  "www.github.com",
])

/**
 * GitHub's own pages that take a second segment, so look like
 * `owner/name` but aren't a repository: `github.com/orgs/vercel`.
 */
const NOT_OWNERS: ReadonlySet<string> = new Set([
  "about",
  "apps",
  "codespaces",
  "collections",
  "customer-stories",
  "enterprise",
  "enterprises",
  "events",
  "explore",
  "features",
  "issues",
  "login",
  "marketplace",
  "new",
  "notifications",
  "organizations",
  "orgs",
  "pricing",
  "pulls",
  "readme",
  "search",
  "security",
  "sessions",
  "settings",
  "site",
  "solutions",
  "sponsors",
  "topics",
  "trending",
  "users",
])

/**
 * An account name as GitHub allows it: letters, digits and single hyphens,
 * not at either end, at most 39 characters.
 */
const OWNER = /^(?=.{1,39}$)[A-Za-z\d](?:[A-Za-z\d]|-(?=[A-Za-z\d]))*$/

/** A repository name as GitHub allows it: letters, digits, `.`, `-`, `_`. */
const NAME = /^[\w.-]{1,100}$/

/**
 * The repository an address names, or why it names none. Accepts what a
 * member is likely to paste: `https://github.com/owner/name`, with or
 * without the scheme or `www.`, with `.git`, a branch or a path inside the
 * repository (all normalised to the repository, the spec's edge cases), the
 * SSH form `git@github.com:owner/name.git`, and `owner/name` alone.
 */
export function repositoryFrom(address: string): Address {
  const text = address.trim()
  if (text === "") return { refusal: REFUSALS.empty }
  if (/\s/.test(text)) return { refusal: REFUSALS.malformed }

  const located = locate(text)
  if (located === null) return { refusal: REFUSALS.malformed }
  if (!GITHUB_HOSTS.has(located.host.toLowerCase())) {
    return { refusal: REFUSALS.notGitHub }
  }

  const [owner = "", rawName = ""] = located.path.split("/").filter(Boolean)
  const name = rawName.replace(/\.git$/i, "")
  if (
    !OWNER.test(owner) ||
    NOT_OWNERS.has(owner.toLowerCase()) ||
    !NAME.test(name) ||
    name === "." ||
    name === ".."
  ) {
    return { refusal: REFUSALS.notRepository }
  }
  return { repository: `${owner}/${name}` }
}

/** An address's host and path, in any of the forms accepted, or null. */
function locate(text: string): { host: string; path: string } | null {
  const ssh = /^git@([^:/]+):([^:]*)$/.exec(text)
  if (ssh) return { host: ssh[1] ?? "", path: ssh[2] ?? "" }
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(text)) return fromUrl(text)
  // A host without its scheme: `github.com/owner/name`.
  if (/^[^/:]+\.[^/:]+(?:\/|$)/.test(text)) return fromUrl(`https://${text}`)
  // `owner/name` alone.
  if (/^[^/:.]+\/[^/:]+\/?$/.test(text))
    return { host: "github.com", path: text }
  return null
}

/** A web address's host and path, or null when it isn't one. */
function fromUrl(text: string): { host: string; path: string } | null {
  if (!URL.canParse(text)) return null
  const url = new URL(text)
  if (url.protocol !== "https:" && url.protocol !== "http:") return null
  if (url.username !== "" || url.password !== "") return null
  return { host: url.hostname, path: url.pathname }
}
