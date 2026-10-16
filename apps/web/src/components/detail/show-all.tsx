import { useState } from "react"
import { Button } from "@workspace/ui/components/shadcn-ui/button"

/**
 * A list's first `limit` items, and the toggle for the rest when there are
 * more (spec 004 plan D-05; spec 005 plan D-05, D-06): the summary's lists,
 * each kind of insight and the routes. With no limit, every item.
 */
export function useShowAll<T>(items: ReadonlyArray<T>, limit?: number) {
  const [showAll, setShowAll] = useState(false)
  const more = limit !== undefined && items.length > limit
  return {
    shown: more && !showAll ? items.slice(0, limit) : items,
    toggle: more
      ? { showAll, onToggle: () => setShowAll(!showAll) }
      : undefined,
  }
}

/**
 * "Show all", with the full count when the list may show one, and "Show
 * fewer" once open.
 */
export function ShowAllButton({
  showAll,
  onToggle,
  count,
}: {
  showAll: boolean
  onToggle: () => void
  count?: number
}) {
  return (
    <Button variant="link" size="sm" aria-expanded={showAll} onClick={onToggle}>
      {showAll
        ? "Show fewer"
        : count === undefined
          ? "Show all"
          : `Show all ${count}`}
    </Button>
  )
}
