import { fileName, folderOf } from "@workspace/parser/paths"
import { Badge } from "@workspace/ui/components/shadcn-ui/badge"

/**
 * A file's name, then its folder, muted and cut from its start, so the end
 * that tells two `page.tsx` apart stays in view, then its mark. The name
 * never shrinks (any shrink, even a fraction of a pixel, would cut it) and
 * is cut only when it alone is wider than its button. A button narrower than
 * 13rem shows the name alone, so the button needs `@container`; the whole
 * path shows on hover (`title`) and the button's name is `pathLabelText`.
 */
export function PathLabel({ path, mark }: { path: string; mark?: string }) {
  const folder = folderOf(path)
  return (
    <>
      <span className="max-w-full shrink-0 truncate">{fileName(path)}</span>
      {folder !== "" && (
        <span className="hidden min-w-0 truncate text-muted-foreground [direction:rtl] @min-[13rem]:inline">
          <bdi dir="ltr">{folder}</bdi>
        </span>
      )}
      {mark !== undefined && (
        <Badge
          variant="outline"
          className="ms-auto hidden shrink-0 font-sans @min-[13rem]:inline-flex"
        >
          {mark}
        </Badge>
      )}
    </>
  )
}

/** A path label's accessible name: all of it, in the order shown. */
export const pathLabelText = (path: string, mark?: string): string =>
  [fileName(path), folderOf(path), mark].filter(Boolean).join(" ")
