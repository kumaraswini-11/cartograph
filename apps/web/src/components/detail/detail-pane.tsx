import { startTransition, useEffect, useRef, useState } from "react"
import { SparklesIcon, XIcon } from "lucide-react"
import { ROOT_LABEL } from "@workspace/graph"
import type { Direction, Selection } from "@workspace/graph"
import { fileName, folderOf } from "@workspace/parser/paths"
import { EmptyState } from "@workspace/ui/components/empty-state"
import { Button } from "@workspace/ui/components/shadcn-ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
} from "@workspace/ui/components/shadcn-ui/sidebar"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/shadcn-ui/tabs"

import { BoxDetail } from "@/components/detail/box-detail"
import { ExplanationTab } from "@/components/detail/explanation"
import { FileDetail } from "@/components/detail/file-detail"
import { PaneScrollContext } from "@/components/detail/file-list"
import { SUMMARY_HEADING, Summary } from "@/components/detail/summary"
import { useMapData } from "@/components/map/map-data"
import { useMapState } from "@/components/map/map-state"

type Tab = "structure" | "explanation"

/**
 * The detail pane (spec 003, FR-001, FR-002; spec 004): built on shadcn's
 * Sidebar, always open, so always a column and never an overlay. With
 * nothing selected it's the repository's summary (C-01); with a selection,
 * its Structure and Explanation tabs. The pane holds the open tab, so a new
 * selection keeps it (FR-009).
 */
export function DetailPane() {
  const scroller = useRef<HTMLDivElement>(null)
  // Set when the pane's own button clears the selection: the summary then
  // takes the focus, so it doesn't fall to the page (FR-006).
  const focusSummary = useRef(false)
  const {
    state: { selection },
    actions,
  } = useMapState()
  const [tab, setTab] = useState<Tab>("structure")
  // Blast radius or dependency chain, kept like the tab (plan D-04).
  const [reach, setReach] = useState<Direction | null>(null)

  // Each selection is read from its top; the summary takes the focus when
  // the pane's own button cleared the selection.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
    if (selection === null && focusSummary.current) {
      focusSummary.current = false
      document.getElementById(SUMMARY_HEADING)?.focus()
    }
  }, [selection])

  return (
    <Sidebar
      collapsible="none"
      side="right"
      role="complementary"
      aria-labelledby="pane-heading"
      className="border-s"
      style={
        {
          "--sidebar-width": "clamp(10rem, 24vw, 20rem)",
        } as React.CSSProperties
      }
    >
      <h2 id="pane-heading" className="sr-only">
        Details
      </h2>
      <SidebarContent ref={scroller}>
        <PaneScrollContext value={scroller}>
          {selection === null ? (
            <Summary />
          ) : (
            <SelectionDetail
              selection={selection}
              tab={tab}
              onTab={setTab}
              reach={reach}
              onReach={(direction) =>
                // A long walk takes more than a frame to list: a transition,
                // like the map state's, so the click paints first.
                startTransition(() => setReach(direction))
              }
              onClear={() => {
                focusSummary.current = true
                actions.select(null)
              }}
            />
          )}
        </PaneScrollContext>
      </SidebarContent>
    </Sidebar>
  )
}

/** A selected file or box: its name, a way back, and the two tabs (FR-008). */
function SelectionDetail({
  selection,
  tab,
  onTab,
  reach,
  onReach,
  onClear,
}: {
  selection: Selection
  tab: Tab
  onTab: (tab: Tab) => void
  reach: Direction | null
  onReach: (direction: Direction | null) => void
  onClear: () => void
}) {
  const { boxMap } = useMapData()
  const box = boxMap.byId.get(selection.box)
  const title =
    selection.file === undefined
      ? (box?.label ?? ROOT_LABEL)
      : fileName(selection.file)
  // Under the name: a file's folder, or a box's full path when its label is
  // a shorter form of it (`003` FR-006).
  const where =
    selection.file === undefined
      ? box && box.id !== "" && box.id !== box.label
        ? box.id
        : null
      : folderOf(selection.file) || ROOT_LABEL

  return (
    <>
      <SidebarGroup className="flex-row items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-2 pt-1">
          <h3 className="font-mono text-path font-medium break-all">{title}</h3>
          {where !== null && (
            <p className="font-mono text-xs break-all text-muted-foreground">
              {where}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Clear selection"
          onClick={onClear}
        >
          <XIcon />
        </Button>
      </SidebarGroup>
      <Tabs
        value={tab}
        onValueChange={(value: Tab) => onTab(value)}
        className="gap-0"
      >
        <SidebarGroup className="py-0">
          <TabsList className="w-full">
            <TabsTrigger value="structure">Structure</TabsTrigger>
            <TabsTrigger value="explanation">Explanation</TabsTrigger>
          </TabsList>
        </SidebarGroup>
        <TabsContent value="structure">
          {selection.file !== undefined ? (
            // Not remounted per file: the reach choice and its toggle stay
            // as they are, and each walk's lists key themselves by file.
            <FileDetail path={selection.file} reach={reach} onReach={onReach} />
          ) : (
            <BoxDetail id={selection.box} />
          )}
        </TabsContent>
        <TabsContent value="explanation">
          {selection.file !== undefined ? (
            <ExplanationTab path={selection.file} />
          ) : (
            <EmptyState
              icon={<SparklesIcon />}
              title="No explanation yet"
              description="An explanation of this box, written from its real neighbours, will appear here."
            />
          )}
        </TabsContent>
      </Tabs>
    </>
  )
}
