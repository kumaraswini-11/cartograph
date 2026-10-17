// AC-10 (spec 003, FR-017): the banner, rendered as the server would, at
// coverages either side of the threshold.
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { CoverageBanner } from "./coverage-banner"

describe("the coverage banner (FR-017, AC-10)", () => {
  it("names the figure below COVERAGE_PARTIAL_BELOW, open or collapsed", () => {
    for (const defaultOpen of [true, false]) {
      const html = renderToStaticMarkup(
        <CoverageBanner coverage={0.9} defaultOpen={defaultOpen} />
      )
      expect(html).toContain("Coverage 90%")
    }
  })

  it("explains the figure only when open", () => {
    const open = renderToStaticMarkup(
      <CoverageBanner coverage={0.9} defaultOpen />
    )
    const collapsed = renderToStaticMarkup(<CoverageBanner coverage={0.9} />)
    expect(open).toContain("could be followed")
    expect(collapsed).not.toContain("could be followed")
  })

  it("shows nothing at or above the threshold, or with no imports", () => {
    for (const coverage of [0.95, 0.975, 1, null]) {
      expect(renderToStaticMarkup(<CoverageBanner coverage={coverage} />)).toBe(
        ""
      )
    }
  })
})
