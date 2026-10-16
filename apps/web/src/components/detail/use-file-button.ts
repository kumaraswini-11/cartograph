import { useChooseFile } from "@/components/detail/use-choose-file"
import { useHoverHandlers, useHovered } from "@/components/map/map-hover"

/**
 * The props of a file's button anywhere in the detail pane: choosing it
 * selects the file on the map (spec 004 FR-011; spec 005 FR-009, FR-011),
 * and hovering or focusing it marks the file there, as a file hovered on the
 * map marks it here (004 FR-013). The button styles the mark with `MARKED`.
 */
export function useFileButton(path: string) {
  const choose = useChooseFile()
  const hover = useHoverHandlers(path)
  const marked = useHovered((hovered) => hovered === path)
  return { onClick: () => choose(path), ...hover, "data-marked": marked }
}
