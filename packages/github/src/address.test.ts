import { describe, expect, it } from "vitest"

import { REFUSALS, repositoryFrom } from "./address.ts"

describe("repositoryFrom", () => {
  it.each([
    ["https://github.com/facebook/react", "facebook/react"],
    ["http://github.com/facebook/react", "facebook/react"],
    ["https://www.github.com/facebook/react", "facebook/react"],
    ["github.com/facebook/react", "facebook/react"],
    ["  https://github.com/facebook/react  ", "facebook/react"],
    ["https://GitHub.com/TanStack/router", "TanStack/router"],
    ["facebook/react", "facebook/react"],
    ["vercel/next.js", "vercel/next.js"],
    // The spec's edge cases: `.git`, a branch or a path → the repository.
    ["https://github.com/facebook/react.git", "facebook/react"],
    ["https://github.com/facebook/react/", "facebook/react"],
    ["https://github.com/vercel/next.js/tree/canary", "vercel/next.js"],
    [
      "https://github.com/vercel/next.js/blob/canary/packages/next/package.json",
      "vercel/next.js",
    ],
    ["https://github.com/facebook/react/issues?q=is%3Aopen", "facebook/react"],
    ["https://github.com/facebook/react#readme", "facebook/react"],
    ["git@github.com:facebook/react.git", "facebook/react"],
  ])("reads %s as %s", (address, repository) => {
    expect(repositoryFrom(address)).toEqual({ repository })
  })

  // AC-09: a GitLab address, a malformed one and a GitHub address that
  // isn't a repository, each refused with its reason.
  it.each([
    ["https://gitlab.com/gitlab-org/gitlab", REFUSALS.notGitHub],
    ["gitlab.com/gitlab-org/gitlab", REFUSALS.notGitHub],
    ["git@gitlab.com:gitlab-org/gitlab.git", REFUSALS.notGitHub],
    ["https://bitbucket.org/atlassian/python-bitbucket", REFUSALS.notGitHub],
    [
      "https://gist.github.com/octocat/6cad326836d38bd3a7ae",
      REFUSALS.notGitHub,
    ],
    ["", REFUSALS.empty],
    ["   ", REFUSALS.empty],
    ["not an address", REFUSALS.malformed],
    ["react", REFUSALS.malformed],
    ["ht!tp://github.com/facebook/react", REFUSALS.malformed],
    ["ftp://github.com/facebook/react", REFUSALS.malformed],
    ["https://user:secret@github.com/facebook/react", REFUSALS.malformed],
    ["https://github.com", REFUSALS.notRepository],
    ["https://github.com/facebook", REFUSALS.notRepository],
    ["https://github.com/orgs/vercel", REFUSALS.notRepository],
    ["https://github.com/settings/profile", REFUSALS.notRepository],
    ["https://github.com/topics/react", REFUSALS.notRepository],
    ["https://github.com/-facebook/react", REFUSALS.notRepository],
    ["https://github.com/face--book/react", REFUSALS.notRepository],
    ["https://github.com/facebook/re%20act", REFUSALS.notRepository],
    ["https://github.com/facebook/..", REFUSALS.notRepository],
  ])("refuses %j: %s", (address, refusal) => {
    expect(repositoryFrom(address)).toEqual({ refusal })
  })
})
