// The image link previews show (Open Graph `og:image`, X's large card): one
// source for the page tags (site.ts) and the script that draws it
// (scripts/og-image.ts). 1200 × 630 suits Facebook, LinkedIn and X alike.
export const SHARE_IMAGE = {
  path: "/og.png",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "Cartograph: a repository's folders as boxes and its imports as lines.",
} as const
