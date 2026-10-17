import { describe, expect, it } from "vitest"

import {
  SITE,
  absoluteUrl,
  pageTitle,
  seo,
  siteMeta,
  websiteJsonLd,
} from "./site"

type Tag = { name?: string; property?: string; content?: string }
const content = (meta: ReadonlyArray<Tag>, key: string) =>
  meta.find((m) => m.property === key || m.name === key)?.content

describe("search and share tags", () => {
  it("gives every page Open Graph's four required tags, absolute", () => {
    const page = seo({ title: "T", description: "D", path: "/sign-in" })
    const meta = [...siteMeta(), ...page.meta]
    expect(content(meta, "og:title")).toBe("T")
    expect(content(meta, "og:type")).toBe("website")
    expect(content(meta, "og:url")).toBe(absoluteUrl("/sign-in"))
    expect(content(meta, "twitter:url")).toBe(absoluteUrl("/sign-in"))
    expect(content(meta, "og:image")).toMatch(/^https?:\/\/.+\/og\.png$/)
    expect(content(meta, "og:image:alt")).toBe(SITE.image.alt)
  })

  it("keeps the home description short enough for three lines on mobile", () => {
    expect(SITE.description.length).toBeLessThanOrEqual(120)
  })

  it("names X's card type, which has no Open Graph fallback", () => {
    expect(content(siteMeta(), "twitter:card")).toBe("summary_large_image")
  })

  it("links each page to one canonical address, the same as og:url", () => {
    const page = seo({ title: "T", description: "D", path: "/" })
    expect(page.links).toEqual([{ rel: "canonical", href: absoluteUrl("/") }])
  })

  it("puts the site's name after a page's own title", () => {
    expect(pageTitle("shadcn-ui/taxonomy")).toBe(
      "shadcn-ui/taxonomy · Cartograph"
    )
  })

  it("states the site's name as WebSite structured data", () => {
    expect(JSON.parse(websiteJsonLd().children)).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Cartograph",
      url: absoluteUrl("/"),
    })
  })
})
