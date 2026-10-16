import { Fragment, useId, useMemo } from "react"
import { ChevronDownIcon } from "lucide-react"
import { SUMMARY_LIST_LENGTH, insights, sentenceOf } from "@workspace/graph"
import type { Insight } from "@workspace/graph"
import { Button } from "@workspace/ui/components/shadcn-ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/shadcn-ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@workspace/ui/components/shadcn-ui/sidebar"
import { cn } from "@workspace/ui/lib/utils"

import { ShowAllButton, useShowAll } from "@/components/detail/show-all"
import { useFileButton } from "@/components/detail/use-file-button"
import { useMapData } from "@/components/map/map-data"
import { MARKED } from "@/components/map/map-hover"

/** Each kind's heading. */
const HEADINGS: Record<Insight["kind"], string> = {
  unimported: "Unimported files",
  "heavily imported": "Heavily imported files",
  cycle: "Cycles",
  oversized: "Oversized files",
}

/**
 * The summary's insights (spec 005, FR-006 to FR-009, plan D-05): closed
 * until opened, so they're never the first thing shown (C-04), and with no
 * count anywhere, so they never read as "N issues found" (C-05). One list
 * per kind present, in FR-007's order. The closed panel stays in the page,
 * hidden until found: the server's HTML carries the insights (D-01), and the
 * browser's find in page opens the section on a match.
 */
export function Insights() {
  const { input } = useMapData()
  const kinds = useMemo(() => {
    const byKind = new Map<Insight["kind"], Array<Insight>>()
    for (const insight of insights(input)) {
      const list = byKind.get(insight.kind)
      if (list) list.push(insight)
      else byKind.set(insight.kind, [insight])
    }
    return [...byKind]
  }, [input])

  return (
    <Collapsible className="group/collapsible">
      <SidebarGroup>
        <h3>
          <SidebarGroupLabel
            render={<CollapsibleTrigger />}
            className="w-full gap-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            Insights
            <ChevronDownIcon className="ms-auto transition-transform group-data-open/collapsible:rotate-180 motion-reduce:transition-none" />
          </SidebarGroupLabel>
        </h3>
        <CollapsibleContent hiddenUntilFound>
          <SidebarGroupContent>
            {kinds.length === 0 ? (
              <p className="px-2 text-sm text-muted-foreground">
                No file is unimported, heavily imported, on a cycle or
                oversized.
              </p>
            ) : (
              kinds.map(([kind, list]) => (
                <KindList key={kind} heading={HEADINGS[kind]} list={list} />
              ))
            )}
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

/** One kind's insights: the first SUMMARY_LIST_LENGTH, then "Show all". */
function KindList({
  heading,
  list,
}: {
  heading: string
  list: ReadonlyArray<Insight>
}) {
  const headingId = useId()
  const { shown, toggle } = useShowAll(list, SUMMARY_LIST_LENGTH)
  return (
    <>
      <SidebarGroupLabel id={headingId} render={<h4 />}>
        {heading}
      </SidebarGroupLabel>
      <ul
        aria-labelledby={headingId}
        className="flex flex-col gap-2 px-2 text-sm"
      >
        {shown.map((insight) => (
          <li key={"file" in insight ? insight.file : insight.files.join()}>
            <Sentence insight={insight} />
          </li>
        ))}
      </ul>
      {/* No count: the section never says how many (C-05). */}
      {toggle && <ShowAllButton {...toggle} />}
    </>
  )
}

/** An insight's fixed sentence, each file in it a button (FR-006, FR-009). */
function Sentence({ insight }: { insight: Insight }) {
  return sentenceOf(insight).map((part, i) =>
    typeof part === "string" ? (
      <Fragment key={i}>{part}</Fragment>
    ) : (
      <FileInSentence key={i} path={part.file} />
    )
  )
}

/**
 * A file named in a sentence: underlined, so it doesn't stand out by its
 * colour alone, and broken anywhere, so a long path wraps in the pane.
 */
function FileInSentence({ path }: { path: string }) {
  const button = useFileButton(path)
  return (
    <Button
      variant="link"
      {...button}
      className={cn(
        "inline h-auto rounded-sm p-0 text-start align-baseline font-mono text-path font-normal break-all whitespace-normal underline",
        MARKED
      )}
    >
      {path}
    </Button>
  )
}
