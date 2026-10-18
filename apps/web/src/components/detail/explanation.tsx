import { SparklesIcon } from "lucide-react"
import { useServerFn } from "@tanstack/react-start"

import { EmptyState } from "@workspace/ui/components/empty-state"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/shadcn-ui/alert"
import { Badge } from "@workspace/ui/components/shadcn-ui/badge"
import { Button } from "@workspace/ui/components/shadcn-ui/button"
import { Skeleton } from "@workspace/ui/components/shadcn-ui/skeleton"

import { ExplanationText } from "@/components/detail/explanation-text"
import { subjectKey, useExplanations } from "@/components/map/explanations"
import { explain, staleness } from "@/lib/explanations.functions"
import type {
  ExplainResult,
  ExplainSubject,
  Staleness,
} from "@/lib/explanations"

/** Why there's no explanation, in words, for each way it can fail. */
function notice(result: ExplainResult): string | null {
  switch (result.status) {
    case "explained":
      return null
    case "limited":
      return "The model's free request limit is reached. Try again later."
    case "ungrounded":
      return "The model named files that aren't in this repository, so its answer was discarded. Try again later."
    case "failed":
      return result.message
  }
}

/**
 * What a stale explanation says (FR-015): whether the file itself changed,
 * or only the repository around it moved. Null while it's current, or
 * unknown.
 */
function staleNotice(
  subject: ExplainSubject,
  stale: Staleness | undefined
): { title: string; description: string } | null {
  const rerun = "Re-run the analysis to explain it as it is now."
  if (stale?.status === "changed") {
    return {
      title: "This file has changed",
      description: `It's different at the repository's latest commit, so this explanation may be out of date. ${rerun}`,
    }
  }
  if (stale?.status === "moved") {
    return {
      title: "The repository has moved on",
      description:
        subject.kind === "file"
          ? `This file is unchanged since the analysis, but the files around it may not be. ${rerun}`
          : `This box's files may have changed since the analysis. ${rerun}`,
    }
  }
  return null
}

/**
 * A file's or box's Explanation tab (spec 009, FR-001 to FR-008): asked
 * for with a button, so nothing is spent unasked, then the paragraph in its
 * three formats, every path in it a way to that file on the map. An
 * explanation asked for this session shows again at once (FR-004). Once
 * one is shown, the repository is checked, and a stale one says so, with
 * the page's Re-run (FR-014, FR-015).
 */
export function ExplanationTab({ subject }: { subject: ExplainSubject }) {
  const explanations = useExplanations()
  const ask = useServerFn(explain)
  const check = useServerFn(staleness)

  if (explanations === null) {
    return (
      <EmptyState
        icon={<SparklesIcon />}
        title="No explanation here"
        description="Explanations are written for stored analyses."
      />
    )
  }
  const key = subjectKey(subject)
  const result = explanations.results.get(key)
  // Held per subject: moving to another file while this one is asked for
  // shows that file as it is, and coming back shows this one still pending.
  const pending = explanations.asking.has(key)
  const stale = staleNotice(subject, explanations.staleness.get(key))
  // Not awaited by the request: the explanation shows at once, and the
  // notice follows when GitHub answers (plan D-10).
  const checkStaleness = async () => {
    let answer: Staleness
    try {
      answer = await check({
        data: { analysisId: explanations.analysisId, subject },
      })
    } catch {
      answer = { status: "unknown" }
    }
    explanations.rememberStaleness(subject, answer)
  }
  const request = async () => {
    explanations.begin(subject)
    let answer: ExplainResult
    try {
      answer = await ask({
        data: { analysisId: explanations.analysisId, subject },
      })
    } catch {
      answer = {
        traced: false,
        status: "failed",
        message: "The explanation couldn't be written. Try again later.",
      }
    }
    explanations.remember(subject, answer)
    if (answer.status === "explained") void checkStaleness()
  }

  return (
    <section aria-label="Explanation" className="flex flex-col gap-3 p-4">
      {pending ? (
        // The paragraph's shape while it's written, so nothing jumps.
        <div role="status" className="flex flex-col gap-2">
          <span className="sr-only">Writing the explanation</span>
          <Skeleton className="h-4 w-full motion-reduce:animate-none" />
          <Skeleton className="h-4 w-11/12 motion-reduce:animate-none" />
          <Skeleton className="h-4 w-4/5 motion-reduce:animate-none" />
        </div>
      ) : result?.status === "explained" ? (
        <ExplanationText text={result.explanation.body} />
      ) : (
        <>
          {result !== undefined && (
            <p role="status" className="text-sm text-muted-foreground">
              {notice(result)}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => void request()}
          >
            {result !== undefined
              ? "Try again"
              : subject.kind === "file"
                ? "Explain this file"
                : "Explain this box"}
          </Button>
        </>
      )}
      {result?.status === "explained" && result.explanation.inferredRole && (
        <p className="text-xs text-muted-foreground">
          Role, inferred:{" "}
          <Badge variant="outline">{result.explanation.inferredRole}</Badge>
        </p>
      )}
      {result !== undefined && !result.traced && (
        // FR-013: everything works untraced, and says so.
        <p className="text-xs text-muted-foreground">Tracing is off.</p>
      )}
      {stale !== null && (
        // Last, so arriving late it moves nothing above it; a status, not
        // an alert: it's announced without interrupting (WCAG 4.1.3).
        <Alert role="status">
          <AlertTitle>{stale.title}</AlertTitle>
          <AlertDescription>
            <p>{stale.description}</p>
            {explanations.rerun}
          </AlertDescription>
        </Alert>
      )}
    </section>
  )
}
