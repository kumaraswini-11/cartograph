import { Fragment, useId } from "react"
import { SUMMARY_LIST_LENGTH } from "@workspace/graph"
import { fileName, folderOf } from "@workspace/parser/paths"
import { Button } from "@workspace/ui/components/shadcn-ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@workspace/ui/components/shadcn-ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/shadcn-ui/table"
import { cn } from "@workspace/ui/lib/utils"

import { pathLabelText } from "@/components/detail/path-label"
import { ShowAllButton, useShowAll } from "@/components/detail/show-all"
import { useFileButton } from "@/components/detail/use-file-button"
import { useMapData } from "@/components/map/map-data"
import { MARKED } from "@/components/map/map-hover"

const frameworkList = new Intl.ListFormat("en", { type: "conjunction" })

/** Column headings set as the pane's other headings are: small and muted. */
const HEAD = "h-8 text-xs text-muted-foreground"

/** Where a path may wrap: after each "/". */
const AFTER_SLASH = /(?<=\/)/
/** Where a file name may wrap: before each ".". */
const BEFORE_DOT = /(?=\.)/

/**
 * Text that may wrap at `at`: a break is allowed at each match, never
 * inside a word. A segment wider than its column still breaks anywhere.
 */
function Wrapping({ text, at }: { text: string; at: RegExp }) {
  return text.split(at).map((piece, i) => (
    <Fragment key={i}>
      {i > 0 && <wbr />}
      {piece}
    </Fragment>
  ))
}

/**
 * The analysis's routes (spec 005, FR-010 to FR-012, plan D-06): method,
 * path and the file that declares it, by path then method, the file a
 * button that selects it. With none, why: the code has none, or a framework
 * detected can't have its routes recovered exactly, which is also said
 * under routes recovered from another package's framework.
 */
export function RoutesTable() {
  const { input } = useMapData()
  const headingId = useId()
  const { routes, routesNotRecovered } = input
  const { shown, toggle } = useShowAll(routes, SUMMARY_LIST_LENGTH)
  const notRecovered =
    routesNotRecovered.length === 0
      ? undefined
      : `${frameworkList.format(routesNotRecovered)} routes can't be recovered exactly.`

  return (
    <SidebarGroup>
      <SidebarGroupLabel id={headingId} render={<h3 />} className="gap-2">
        Routes{" "}
        {routes.length > 0 && (
          <span className="ms-auto tabular-nums">{routes.length}</span>
        )}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        {routes.length > 0 && (
          // Fixed columns: the pane is narrow, so paths and file names wrap,
          // never a sideways scroll, and the path has the most room.
          <Table aria-labelledby={headingId} className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className={cn(HEAD, "w-16")}>
                  Method
                </TableHead>
                <TableHead scope="col" className={HEAD}>
                  Path
                </TableHead>
                <TableHead scope="col" className={cn(HEAD, "w-[38%]")}>
                  File
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((route) => (
                <TableRow
                  key={`${route.method} ${route.path} ${route.file}:${route.line}`}
                >
                  <TableCell className="font-mono text-xs">
                    {route.method}
                  </TableCell>
                  <TableCell className="font-mono text-path [overflow-wrap:anywhere] whitespace-normal">
                    <Wrapping text={route.path} at={AFTER_SLASH} />
                  </TableCell>
                  <TableCell className="p-0">
                    <RouteFile path={route.file} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {(routes.length === 0 || notRecovered) && (
          <p className="px-2 text-sm text-muted-foreground">
            {notRecovered ?? "No routes in the code."}
          </p>
        )}
        {toggle && <ShowAllButton {...toggle} count={routes.length} />}
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

/**
 * A route's file (FR-011), as the pane's paths are: its name, then its
 * folder, muted, which tells apart the many `route.ts` of a Next.js app.
 * The column is narrow, so both wrap rather than being cut; the whole path
 * shows on hover, and the button's name is all of it, in the order shown.
 */
function RouteFile({ path }: { path: string }) {
  const button = useFileButton(path)
  const folder = folderOf(path)
  return (
    <Button
      variant="ghost"
      title={path}
      aria-label={pathLabelText(path)}
      {...button}
      className={cn(
        "h-auto w-full justify-start py-1.5 text-start font-mono text-path font-normal [overflow-wrap:anywhere] whitespace-normal",
        MARKED
      )}
    >
      <span className="flex flex-col">
        <span>
          <Wrapping text={fileName(path)} at={BEFORE_DOT} />
        </span>
        {folder !== "" && (
          <span className="text-muted-foreground">
            <Wrapping text={folder} at={AFTER_SLASH} />
          </span>
        )}
      </span>
    </Button>
  )
}
