// What search engines and link previews read about every page: one source
// for the site's name, address, share image and the tags built from them.
// Open Graph: https://ogp.me/ · Google site names and title links:
// https://developers.google.com/search/docs/appearance
import { SHARE_IMAGE } from "./share-image"

/**
 * The site's public address. Open Graph wants absolute http(s) addresses;
 * on Vercel the build sets production's (vite.config.ts), even in previews,
 * so shared links and canonical tags always point at production.
 */
export const SITE_URL = import.meta.env.VITE_SITE_URL ?? "http://localhost:3000"

export const SITE = {
  name: "Cartograph",
  /** The home page's title: the brand, then what it is (Google: title links). */
  title: "Cartograph · Dependency maps for TypeScript and JavaScript",
  description:
    "Map any public TypeScript or JavaScript repository: folders as boxes, imports as lines, all drawn from the code.",
  locale: "en_US",
  image: SHARE_IMAGE,
} as const

/** A page's title: what it is, then the site's name. */
export const pageTitle = (page: string) => `${page} · ${SITE.name}`

/** An absolute address on the site. */
export const absoluteUrl = (path: string) => new URL(path, SITE_URL).toString()

/**
 * The tags every page shares (set once, in the root route): the site's name,
 * the share image, and X's card type, the one tag X can't read from Open
 * Graph. TanStack Router keeps the deepest route's copy of a tag, so a page
 * overrides any of these by setting it again.
 */
export function siteMeta() {
  const image = absoluteUrl(SITE.image.path)
  return [
    { title: SITE.title },
    { name: "description", content: SITE.description },
    { property: "og:site_name", content: SITE.name },
    { property: "og:type", content: "website" },
    { property: "og:locale", content: SITE.locale },
    { property: "og:image", content: image },
    { property: "og:image:type", content: SITE.image.type },
    { property: "og:image:width", content: String(SITE.image.width) },
    { property: "og:image:height", content: String(SITE.image.height) },
    { property: "og:image:alt", content: SITE.image.alt },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: image },
    { name: "twitter:image:alt", content: SITE.image.alt },
  ]
}

/**
 * One page's tags: its title and description for search, the same for Open
 * Graph and X, and its canonical address as `og:url`, `twitter:url` and the
 * canonical link.
 */
export function seo(page: {
  title: string
  description: string
  path: string
}) {
  const url = absoluteUrl(page.path)
  return {
    meta: [
      { title: page.title },
      { name: "description", content: page.description },
      { property: "og:title", content: page.title },
      { property: "og:description", content: page.description },
      { property: "og:url", content: url },
      { name: "twitter:title", content: page.title },
      { name: "twitter:description", content: page.description },
      // Not one of X's card tags, but harmless, and link checkers ask for it.
      { name: "twitter:url", content: url },
    ],
    links: [{ rel: "canonical", href: url }],
  }
}

/**
 * The site's name for Google, as WebSite structured data: on the home page
 * only (Google: site names).
 */
export function websiteJsonLd() {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE.name,
      url: absoluteUrl("/"),
    }),
  }
}
