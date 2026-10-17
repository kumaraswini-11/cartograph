import { describe, expect, it } from "vitest"

import { GitHubError } from "./errors.ts"
import { defaultBranchHead, headFrom } from "./head.ts"
import { fakeFetch } from "./testing.ts"

const COMMIT = "5ba419aa7350389a275ab45fde2e849ed1f02449"
const CAPABILITIES =
  "multi_ack thin-pack side-band ofs-delta symref=HEAD:refs/heads/master agent=git/github-1"

/** One pkt-line: four hex digits of length (their own included), then data. */
function pkt(data: string): string {
  return `${(data.length + 4).toString(16).padStart(4, "0")}${data}`
}

/** git's smart HTTP ref advertisement, as GitHub sends it. */
function advertisement(...refs: Array<string>): string {
  return `${pkt("# service=git-upload-pack\n")}0000${refs.map(pkt).join("")}0000`
}

/** A body sent in `size`-byte chunks; reading past `limit` chunks fails. */
function chunked(text: string, size: number, limit = Infinity) {
  const bytes = new TextEncoder().encode(text)
  let sent = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent / size >= limit) throw new Error("read past the HEAD line")
      if (sent >= bytes.length) return controller.close()
      controller.enqueue(bytes.subarray(sent, sent + size))
      sent += size
    },
  })
}

describe("defaultBranchHead", () => {
  it("reads the default branch and its commit from git's HTTP protocol", async () => {
    const fetch = fakeFetch(
      () =>
        new Response(
          advertisement(
            `${COMMIT} HEAD\0${CAPABILITIES}\n`,
            `${COMMIT} refs/heads/master\n`
          )
        )
    )
    await expect(
      defaultBranchHead("expressjs/express", { fetch })
    ).resolves.toEqual({ branch: "master", commit: COMMIT })
    expect(fetch.urls).toEqual([
      "https://github.com/expressjs/express.git/info/refs?service=git-upload-pack",
    ])
  })

  it("stops reading after the HEAD line, whatever follows", async () => {
    const text = advertisement(`${COMMIT} HEAD\0${CAPABILITIES}\n`)
    // Seven-byte chunks: lengths and lines split across reads. The body
    // fails if read beyond what the HEAD line needs.
    const fetch = fakeFetch(
      () =>
        new Response(
          chunked(`${text}${"x".repeat(10_000)}`, 7, Math.ceil(text.length / 7))
        )
    )
    await expect(
      defaultBranchHead("expressjs/express", { fetch })
    ).resolves.toEqual({ branch: "master", commit: COMMIT })
  })

  it.each([401, 404])(
    "reads %i as a repository that doesn't exist or isn't public (FR-008)",
    async (status) => {
      const fetch = fakeFetch(() => new Response("", { status }))
      const error = await defaultBranchHead("someone/missing", {
        fetch,
      }).catch((e: unknown) => e)
      expect(error).toBeInstanceOf(GitHubError)
      expect((error as GitHubError).failure).toEqual({
        kind: "not found",
        repository: "someone/missing",
      })
      expect((error as GitHubError).message).toBe(
        "someone/missing doesn't exist or isn't public"
      )
    }
  )

  it("reads any other refusal as GitHub being unavailable", async () => {
    const fetch = fakeFetch(() => new Response("", { status: 503 }))
    await expect(
      defaultBranchHead("expressjs/express", { fetch })
    ).rejects.toMatchObject({
      failure: { kind: "unavailable", status: 503 },
    })
  })

  it("reads a repository with no refs as empty", async () => {
    const fetch = fakeFetch(() => new Response(advertisement()))
    await expect(
      defaultBranchHead("someone/empty", { fetch })
    ).rejects.toMatchObject({ failure: { kind: "empty" } })
  })
})

describe("headFrom", () => {
  it("needs HEAD, a commit and the branch it points to", () => {
    expect(headFrom(`${COMMIT} HEAD\0${CAPABILITIES}\n`)).toEqual({
      branch: "master",
      commit: COMMIT,
    })
    expect(headFrom(`${COMMIT} refs/heads/master\0${CAPABILITIES}`)).toBeNull()
    expect(headFrom(`${COMMIT} HEAD\0multi_ack thin-pack`)).toBeNull()
    expect(headFrom(`${"0".repeat(40)} HEAD\0${CAPABILITIES}`)).toBeNull()
    expect(headFrom(`not-a-commit HEAD\0${CAPABILITIES}`)).toBeNull()
  })

  it("keeps a branch name with slashes whole", () => {
    expect(
      headFrom(`${COMMIT} HEAD\0symref=HEAD:refs/heads/release/v2 agent=x`)
    ).toEqual({ branch: "release/v2", commit: COMMIT })
  })
})
