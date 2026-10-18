import {
  CircleAlertIcon,
  CircleCheckIcon,
  LoaderCircleIcon,
} from "lucide-react"
import type { ReactNode } from "react"

import type { ChatMessage } from "@workspace/ai"
import { EXPLAIN_MAX_LINES } from "@workspace/ai/source"
import { SUMMARY_LIST_LENGTH, countOf } from "@workspace/graph"
import {
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@workspace/ui/components/shadcn-ui/trace"

import { ExplanationText } from "@/components/detail/explanation-text"
import { FactList } from "@/components/detail/fact-list"
import { NEIGHBOUR_LISTS, fileFacts } from "@/components/detail/file-detail"
import { FileList } from "@/components/detail/file-list"
import { Sentence } from "@/components/detail/insights"
import { WALKS, WalkLevels } from "@/components/detail/reach"
import { RoutesTable } from "@/components/detail/routes-table"
import { ShowAllButton, useShowAll } from "@/components/detail/show-all"
import { useMapData } from "@/components/map/map-data"

/** One lookup's part of an answer, typed by its tool (`ChatTools`). */
export type LookupPart = Extract<
  ChatMessage["parts"][number],
  { type: `tool-${string}` }
>

/** A path in a lookup's title, as the pane writes paths. */
const Path = ({ path }: { path: string }) => (
  <code className="font-mono text-path">{path}</code>
)

/**
 * One lookup's line (spec 010, FR-004, C-02): running while it runs, then
 * what it found, with what it returned open below it, never collapsed by
 * default; a failure says so (the spec's edge case). Titles carry the
 * state, as `Trace` asks, since colour and motion alone don't.
 */
function LookupLine({
  state,
  running,
  done,
  children,
}: {
  state: LookupPart["state"]
  running: ReactNode
  done: ReactNode
  children?: ReactNode
}) {
  if (state === "output-error") {
    return (
      <TraceLine status="error">
        <TraceIcon>
          <CircleAlertIcon />
        </TraceIcon>
        <TraceTitle>Couldn&apos;t finish: {running}</TraceTitle>
      </TraceLine>
    )
  }
  if (state !== "output-available") {
    return (
      <TraceLine status="running">
        <TraceIcon>
          <LoaderCircleIcon className="animate-spin motion-reduce:animate-none" />
        </TraceIcon>
        <TraceTitle>{running}</TraceTitle>
      </TraceLine>
    )
  }
  const line = (
    <TraceLine>
      <TraceIcon>
        <CircleCheckIcon />
      </TraceIcon>
      <TraceTitle>{done}</TraceTitle>
    </TraceLine>
  )
  if (children === undefined) return line
  return (
    <TraceCollapsible defaultOpen>
      <TraceCollapsibleTrigger>{line}</TraceCollapsibleTrigger>
      <TraceCollapsibleContent className="flex flex-col gap-2 px-0">
        {children}
      </TraceCollapsibleContent>
    </TraceCollapsible>
  )
}

/** A lookup past the limit isn't shown; nor is anything it would return. */
const ran = <T extends object>(output: T | { notRun: string } | undefined) =>
  output === undefined || "notRun" in output ? undefined : output

/** One lookup, as its tool returned it: the pane's own pieces show it. */
export function Lookup({ part }: { part: LookupPart }) {
  const { tierOf } = useMapData()
  switch (part.type) {
    case "tool-find_files": {
      const query = part.input?.query ?? ""
      const output = ran(part.output)
      const files = output?.files ?? []
      return (
        <LookupLine
          state={part.state}
          running={`Finding files matching “${query}”`}
          done={
            files.length === 0
              ? `No file matches “${query}”`
              : `Found ${countOf(files.length, "file", "files")} matching “${query}”`
          }
        >
          {files.length === 0 ? undefined : (
            <FileList
              heading="Matches"
              rows={files.map((path) => ({ path }))}
              limit={SUMMARY_LIST_LENGTH}
              empty=""
            />
          )}
        </LookupLine>
      )
    }
    case "tool-file_details": {
      const path = part.input?.path ?? ""
      const output = ran(part.output)
      return (
        <LookupLine
          state={part.state}
          running={
            <>
              Reading the details of <Path path={path} />
            </>
          }
          done={
            output?.found === true ? (
              <>
                Read the details of <Path path={output.path} />
              </>
            ) : (
              <>
                No file <Path path={path} /> in this analysis
              </>
            )
          }
        >
          {output?.found === true ? (
            <FactList facts={fileFacts(output, tierOf)} />
          ) : undefined}
        </LookupLine>
      )
    }
    case "tool-neighbours": {
      const path = part.input?.path ?? ""
      const output = ran(part.output)
      return (
        <LookupLine
          state={part.state}
          running={
            <>
              Listing the neighbours of <Path path={path} />
            </>
          }
          done={
            output?.found === true ? (
              <>
                Listed the neighbours of <Path path={output.path} />
              </>
            ) : (
              <>
                No file <Path path={path} /> in this analysis
              </>
            )
          }
        >
          {output?.found === true ? (
            <>
              <FileList
                {...NEIGHBOUR_LISTS.dependencies}
                rows={output.dependencies.map((file) => ({ path: file }))}
                limit={SUMMARY_LIST_LENGTH}
              />
              <FileList
                {...NEIGHBOUR_LISTS.dependents}
                rows={output.dependents.map((file) => ({ path: file }))}
                limit={SUMMARY_LIST_LENGTH}
              />
            </>
          ) : undefined}
        </LookupLine>
      )
    }
    case "tool-blast_radius":
    case "tool-dependency_chain": {
      const direction =
        part.type === "tool-blast_radius" ? "dependents" : "dependencies"
      const path = part.input?.path ?? ""
      const output = ran(part.output)
      const total =
        output?.found === true
          ? output.levels.reduce((sum, level) => sum + level.length, 0)
          : 0
      return (
        <LookupLine
          state={part.state}
          running={
            <>
              Walking the {WALKS[direction].name.toLowerCase()} of{" "}
              <Path path={path} />
            </>
          }
          done={
            output?.found === true ? (
              <>
                {WALKS[direction].name} of <Path path={output.path} />:{" "}
                {countOf(total, "file", "files")}
              </>
            ) : (
              <>
                No file <Path path={path} /> in this analysis
              </>
            )
          }
        >
          {output?.found === true ? (
            <WalkLevels
              path={output.path}
              direction={direction}
              levels={output.levels}
              headingLevel="h3"
            />
          ) : undefined}
        </LookupLine>
      )
    }
    case "tool-routes": {
      const output = ran(part.output)
      return (
        <LookupLine
          state={part.state}
          running="Listing the routes"
          done={`Listed ${countOf(output?.routes.length ?? 0, "route", "routes")}`}
        >
          {/* The same routes the pane's table holds: one analysis. */}
          <RoutesTable />
        </LookupLine>
      )
    }
    case "tool-insights": {
      const output = ran(part.output)
      const insights = output?.insights ?? []
      return (
        <LookupLine
          state={part.state}
          running="Listing the insights"
          done={`Listed ${countOf(insights.length, "insight", "insights")}`}
        >
          {insights.length === 0 ? undefined : (
            <InsightSentences insights={insights} />
          )}
        </LookupLine>
      )
    }
    case "tool-explanation": {
      const path = part.input?.path ?? ""
      const output = ran(part.output)
      const body = output?.found === true ? output.explanation : null
      return (
        <LookupLine
          state={part.state}
          running={
            <>
              Reading the explanation of <Path path={path} />
            </>
          }
          done={
            body === null ? (
              <>
                No explanation of <Path path={path} /> yet
              </>
            ) : (
              <>
                Read the explanation of <Path path={path} />
              </>
            )
          }
        >
          {body === null ? undefined : <ExplanationText text={body} />}
        </LookupLine>
      )
    }
    case "tool-source": {
      const path = part.input?.path ?? ""
      const output = ran(part.output)
      return (
        <LookupLine
          state={part.state}
          running={
            <>
              Reading the source of <Path path={path} />
            </>
          }
          done={
            output?.found === true ? (
              <>
                Read the source of <Path path={output.path} />
                {output.shortened
                  ? `, its first ${EXPLAIN_MAX_LINES} of ${output.lines} lines`
                  : ""}
              </>
            ) : (
              <>
                No file <Path path={path} /> in this analysis
              </>
            )
          }
        />
      )
    }
  }
}

/** The insights a lookup returned, as the pane's sentences, then "Show all". */
function InsightSentences({
  insights,
}: {
  insights: ReadonlyArray<Parameters<typeof Sentence>[0]["insight"]>
}) {
  const { shown, toggle } = useShowAll(insights, SUMMARY_LIST_LENGTH)
  return (
    <>
      <ul className="flex flex-col gap-1 text-sm">
        {shown.map((insight, i) => (
          <li key={i}>
            <Sentence insight={insight} />
          </li>
        ))}
      </ul>
      {toggle && <ShowAllButton {...toggle} />}
    </>
  )
}
