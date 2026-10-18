import "@tanstack/react-start/server-only"

import {
  CHAT_MODEL,
  answerQuestion,
  chatResponse,
  fileCacheKey,
  fileToExplain,
  languageModel,
  outcomeOnly,
  readChatMessages,
} from "@workspace/ai"
import { readExplanation } from "@workspace/database"
import { edgeIndex } from "@workspace/graph"
import { z } from "zod"

import { getServerEnv } from "./env.server"
import { ModelCallsSpent, spendModelCall } from "./limits.server"
import { readSession } from "./session.server"
import { sourceAtCommit } from "./source.server"
import { analysisFacts, readStoredAnalysis } from "./stored-analysis.server"
import { requestStorage } from "./storage.server"
import { serverTracing } from "./tracing.server"

/**
 * The most characters a question's request may carry: the browser sends
 * only the conversation's recent text (`KEPT_QUESTIONS`), so a real one is
 * a few kilobytes; anything near this is refused before it's read further.
 */
export const MAX_CHAT_BODY = 64_000

const refuse = (status: number, message: string) =>
  new Response(message, { status })

/**
 * A question about an analysis, answered as a stream (spec 010, plan
 * Approach, D-02, D-03). Signed in, with the member's token: another
 * organization's analysis isn't found. Everything the lookups read comes
 * from the stored result; the request carries only the conversation.
 */
export async function handleChat(
  request: Request,
  analysisId: string
): Promise<Response> {
  if (!z.uuid().safeParse(analysisId).success) {
    return refuse(404, "No such analysis.")
  }
  const session = await readSession()
  if (!session.signedIn) return refuse(401, "Sign in to ask about it.")

  const body = await request.text()
  if (body.length > MAX_CHAT_BODY) return refuse(413, "That's too long.")
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return refuse(400, "That isn't a conversation.")
  }
  const messages = await readChatMessages(
    typeof parsed === "object" && parsed !== null && "messages" in parsed
      ? parsed.messages
      : null
  )
  if (messages === null) return refuse(400, "That isn't a conversation.")

  const storage = await requestStorage()
  const read = await readStoredAnalysis(storage, analysisId)
  if (read?.result == null) return refuse(404, "This analysis has no map yet.")
  const { analysis, result } = read

  // One question, one call against the organization's limit (`012`
  // FR-007), however many steps its lookups take: the limit counts what a
  // member asks for, and the model's own quota is the ceiling (D-06).
  try {
    await spendModelCall(storage, {
      organizationId: session.organization.id,
      kind: "chat",
    })
  } catch (error) {
    if (!(error instanceof ModelCallsSpent)) throw error
    return chatResponse(
      outcomeOnly({ kind: "paused", resumesAt: error.resumesAt }),
      () => Promise.resolve()
    )
  }

  const env = getServerEnv()
  const traces = serverTracing()
  const facts = analysisFacts(analysis.repository, result)

  const stream = answerQuestion(
    {
      input: result.input,
      index: edgeIndex(result.input.edges),
      paths: facts.paths,
    },
    messages,
    {
      model: languageModel(env.GEMINI_API_KEY, CHAT_MODEL),
      traced: traces.traced,
      source: (path) => {
        const file = fileToExplain(facts, path)
        if (file === null) throw new Error(`${path} isn't in this analysis`)
        return sourceAtCommit(analysis.repository, result.commit, file)
      },
      // D-07: the organization's cached explanation only; none is written.
      explanation: async (path) => {
        const file = fileToExplain(facts, path)
        if (file === null) return null
        const cached = await readExplanation(storage, fileCacheKey(file))
        return cached?.body ?? null
      },
    }
  )
  return chatResponse(stream, () => traces.flush())
}
