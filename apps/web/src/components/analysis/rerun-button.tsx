import { useState, useTransition } from "react"
import { useRouter } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"

import { Button } from "@workspace/ui/components/shadcn-ui/button"
import { Spinner } from "@workspace/ui/components/shadcn-ui/spinner"

import { rerunAnalysis } from "@/lib/analyses.functions"
import { runLimitMessage } from "@/lib/limits"

/**
 * Re-runs an analysis (spec 008, FR-003): a new run of the same analysis,
 * never a second analysis. While a run is under way the button is
 * disabled, and the server starts no second run either way (FR-004).
 * Afterwards the page asks storage again, so what it shows is storage's.
 */
export function RerunButton({
  analysisId,
  running,
}: {
  analysisId: string
  /** A run is under way and not stale. */
  running: boolean
}) {
  const router = useRouter()
  const rerun = useServerFn(rerunAnalysis)
  const [pending, startTransition] = useTransition()
  // Why the last re-run didn't start, if it didn't.
  const [refusal, setRefusal] = useState<string | null>(null)

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={running || pending}
        onClick={() =>
          startTransition(async () => {
            setRefusal(null)
            try {
              const result = await rerun({ data: { analysisId } })
              if (result !== null) {
                // The run limit (spec 012, FR-006): when one can start.
                setRefusal(runLimitMessage(result.runsResumeAt))
                return
              }
              await router.invalidate({ sync: true })
            } catch {
              setRefusal("The run didn't start. Try again.")
            }
          })
        }
      >
        {pending && <Spinner />}
        Re-run
      </Button>
      <p role="status" className="text-sm text-destructive empty:hidden">
        {refusal ?? ""}
      </p>
    </div>
  )
}
