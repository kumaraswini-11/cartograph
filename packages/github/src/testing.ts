// Archives for tests, written byte by byte in the ustar format (POSIX
// pax/ustar), so a test can hold links and hostile paths without making
// any on disk.
import { gzipSync } from "node:zlib"

export type TarEntry =
  | { path: string; type: "file"; content: string | Buffer }
  | { path: string; type: "directory" }
  | { path: string; type: "symlink" | "hardlink"; target: string }

const BLOCK = 512

/** One header field: `value` written at `offset`, at most `length` bytes. */
function field(block: Buffer, offset: number, length: number, value: string) {
  block.write(value.slice(0, length), offset, length, "utf8")
}

/** A number as the format writes it: octal, zero-padded, then NUL. */
function octal(value: number, length: number): string {
  return `${value.toString(8).padStart(length - 1, "0")}\0`
}

function header(entry: TarEntry, size: number): Buffer {
  const block = Buffer.alloc(BLOCK)
  field(block, 0, 100, entry.path)
  field(block, 100, 8, octal(entry.type === "directory" ? 0o755 : 0o644, 8))
  field(block, 108, 8, octal(0, 8))
  field(block, 116, 8, octal(0, 8))
  field(block, 124, 12, octal(size, 12))
  field(block, 136, 12, octal(0, 12))
  const flag = { file: "0", hardlink: "1", symlink: "2", directory: "5" }
  field(block, 156, 1, flag[entry.type])
  if (entry.type === "symlink" || entry.type === "hardlink") {
    field(block, 157, 100, entry.target)
  }
  field(block, 257, 6, "ustar\0")
  field(block, 263, 2, "00")
  // The checksum is the sum of the header's bytes, its own field as spaces.
  block.fill(" ", 148, 156)
  const sum = block.reduce((total, byte) => total + byte, 0)
  field(block, 148, 8, `${sum.toString(8).padStart(6, "0")}\0 `)
  return block
}

/** A gzipped tar archive of `entries`, in order. */
export function tarball(entries: ReadonlyArray<TarEntry>): Buffer {
  const parts: Array<Buffer> = []
  for (const entry of entries) {
    const data =
      entry.type === "file" ? Buffer.from(entry.content) : Buffer.alloc(0)
    parts.push(header(entry, data.length), data)
    const padding = (BLOCK - (data.length % BLOCK)) % BLOCK
    parts.push(Buffer.alloc(padding))
  }
  // The end of the archive: two empty blocks.
  parts.push(Buffer.alloc(BLOCK * 2))
  return gzipSync(Buffer.concat(parts))
}

/** A fetch that answers every request with `respond`'s response. */
export function fakeFetch(
  respond: (url: string) => Response
): typeof globalThis.fetch & { urls: Array<string> } {
  const urls: Array<string> = []
  const fake = (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : String(input)
    urls.push(url)
    return Promise.resolve(respond(url))
  }
  return Object.assign(fake, { urls })
}
