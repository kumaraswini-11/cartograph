import {
  createContext,
  use,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { fileName, folderOf } from "@workspace/parser/paths"
import { Badge } from "@workspace/ui/components/shadcn-ui/badge"
import { Button } from "@workspace/ui/components/shadcn-ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/shadcn-ui/sidebar"
import { cn } from "@workspace/ui/lib/utils"

import { useChooseFile } from "@/components/detail/use-choose-file"

/** A list longer than this renders only the rows in view (plan D-06). */
const LIST_VIRTUAL_FROM = 100

/** One row: a SidebarMenuButton is h-8, and a SidebarMenu has no gap. */
const ROW_PX = 32

/**
 * The detail pane's scroll container. Every virtualized list scrolls with
 * it, so the pane never scrolls inside a scroll (plan D-06).
 */
export const PaneScrollContext =
  createContext<React.RefObject<HTMLDivElement | null> | null>(null)

/**
 * A file in a list, with an optional count at the row's end, or a short mark
 * after its path (such as "entry point").
 */
export type FileRow = { path: string; count?: number; mark?: string }

/**
 * The detail pane's one list of files (spec 004, plan D-05), used by the
 * summary, a file's neighbours and each level of a walk: a heading with the
 * full count (FR-004), a row per file that selects it on the map (FR-011),
 * and, with `limit`, the first rows and "Show all N" for the rest.
 */
export function FileList({
  heading,
  rows,
  limit,
  empty,
}: {
  heading: string
  rows: ReadonlyArray<FileRow>
  limit?: number
  /** What the list says when it has no rows. */
  empty: string
}) {
  const headingId = useId()
  const [showAll, setShowAll] = useState(false)
  const shown = limit === undefined || showAll ? rows : rows.slice(0, limit)

  return (
    <SidebarGroup>
      <SidebarGroupLabel id={headingId} render={<h3 />} className="gap-2">
        {heading}
        <span className="ms-auto tabular-nums">{rows.length}</span>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        {rows.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">{empty}</p>
        ) : shown.length > LIST_VIRTUAL_FROM ? (
          <VirtualRows rows={shown} labelledBy={headingId} />
        ) : (
          <SidebarMenu aria-labelledby={headingId}>
            {shown.map((row) => (
              <Row key={row.path} row={row} />
            ))}
          </SidebarMenu>
        )}
        {limit !== undefined && rows.length > limit && (
          <Button
            variant="link"
            size="sm"
            aria-expanded={showAll}
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show fewer" : `Show all ${rows.length}`}
          </Button>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

/**
 * A file's name, then its folder, muted and cut from its start, so the end
 * that tells two `page.tsx` apart stays in view, then its mark. The name
 * never shrinks (any shrink, even a fraction of a pixel, would cut it) and
 * is cut only when it alone is wider than the row. A row narrower than 13rem
 * shows the name alone; the whole path shows on hover, and the button's name
 * always carries all of it, in the order shown.
 */
function Row({
  row,
  ...props
}: { row: FileRow } & React.ComponentProps<typeof SidebarMenuItem>) {
  const choose = useChooseFile()
  const name = fileName(row.path)
  const folder = folderOf(row.path)
  return (
    <SidebarMenuItem {...props}>
      <SidebarMenuButton
        title={row.path}
        aria-label={[name, folder, row.mark].filter(Boolean).join(" ")}
        onClick={() => choose(row.path)}
        // The count sits over the button's end: room is kept for it.
        className={cn(
          "@container font-mono text-[13px]",
          row.count !== undefined && "pe-10"
        )}
      >
        <span className="max-w-full shrink-0 truncate">{name}</span>
        {folder !== "" && (
          <span className="hidden min-w-0 truncate text-muted-foreground [direction:rtl] @min-[13rem]:inline">
            <bdi dir="ltr">{folder}</bdi>
          </span>
        )}
        {row.mark !== undefined && (
          <Badge
            variant="outline"
            className="ms-auto hidden shrink-0 font-sans @min-[13rem]:inline-flex"
          >
            {row.mark}
          </Badge>
        )}
      </SidebarMenuButton>
      {row.count !== undefined && (
        <SidebarMenuBadge className="tabular-nums">
          {row.count}
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  )
}

/**
 * A long list, rendering only the rows in view (plan D-06). Its rows say
 * their place in the whole list, so a screen reader still hears its length.
 */
function VirtualRows({
  rows,
  labelledBy,
}: {
  rows: ReadonlyArray<FileRow>
  labelledBy: string
}) {
  const scroller = use(PaneScrollContext)
  const list = useRef<HTMLUListElement>(null)
  // Where the list starts inside the pane's scroll container; anything above
  // it may change height, so it's read after every render.
  const [offset, setOffset] = useState(0)
  useLayoutEffect(() => {
    const top = list.current?.getBoundingClientRect().top
    const container = scroller?.current
    if (top === undefined || !container) return
    setOffset(top - container.getBoundingClientRect().top + container.scrollTop)
  })
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scroller?.current ?? null,
    estimateSize: () => ROW_PX,
    overscan: 10,
    scrollMargin: offset,
  })

  return (
    <SidebarMenu
      ref={list}
      aria-labelledby={labelledBy}
      className="relative"
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualizer.getVirtualItems().map((item) => {
        const row = rows[item.index]
        if (row === undefined) return null
        return (
          <Row
            key={row.path}
            row={row}
            aria-setsize={rows.length}
            aria-posinset={item.index + 1}
            className="absolute inset-x-0 top-0"
            style={{ transform: `translateY(${item.start - offset}px)` }}
          />
        )
      })}
    </SidebarMenu>
  )
}
