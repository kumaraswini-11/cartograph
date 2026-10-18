import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  isStepCount,
  safeValidateUIMessages,
} from "ai"
import type {
  InferUITools,
  LanguageModel,
  ModelMessage,
  UIMessage,
  UIMessageChunk,
  UIMessageStreamWriter,
} from "ai"

import { isLimited } from "../explain.ts"
import { ungroundedPaths } from "../grounding.ts"
import { MODEL_OPTIONS } from "../model.ts"
import { recentText } from "./history.ts"
import { MAX_LOOKUPS, MAX_STEPS } from "./limits.ts"
import { lookupTools } from "./lookups.ts"
import type { ChatAnalysis, LookupCount, LookupDeps } from "./lookups.ts"
import { LIMIT_NOTE, chatSystemPrompt, ungroundedNote } from "./prompt.ts"

/** How a question ended, sent after its lookups (and its answer, if any). */
export type ChatOutcome =
  /** Answered from its lookups; `stopped` when it hit the limit (FR-005). */
  | { kind: "answered"; stopped: boolean }
  /** No lookup was made, so nothing is answered (FR-007, C-04). */
  | { kind: "declined" }
  /** Two answers in a row named files that aren't there (FR-006). */
  | { kind: "ungrounded" }
  /** The model's request limit is reached (plan D-06). */
  | { kind: "limited" }

/** The lookups as the browser knows them: each part typed by its tool. */
export type ChatTools = InferUITools<ReturnType<typeof lookupTools>>

/** A chat message as the stream and the browser know it. */
export type ChatMessage = UIMessage<never, { outcome: ChatOutcome }, ChatTools>

export type ChatDeps = LookupDeps & { model: LanguageModel }

/** The conversation sent to the model with a question (plan D-06). */
export function keptHistory(
  messages: ReadonlyArray<ChatMessage>
): Promise<Array<ModelMessage>> {
  return convertToModelMessages(recentText(messages))
}

/**
 * The conversation a request carries, checked against the UI message
 * shape, or null if it isn't one. Only its text is ever sent on
 * (`keptHistory`), so nothing else in it reaches the model.
 */
export async function readChatMessages(
  value: unknown
): Promise<Array<ChatMessage> | null> {
  const result = await safeValidateUIMessages<ChatMessage>({ messages: value })
  if (!result.success) return null
  const last = result.data[result.data.length - 1]
  return last?.role === "user" ? result.data : null
}

/**
 * A question's stream as the HTTP response `useChat` reads, calling
 * `onEnd` once it has all been sent: a serverless function can stop as soon
 * as it has, so the traces are flushed there (`009` plan D-03).
 */
export function chatResponse(
  stream: ReadableStream<UIMessageChunk>,
  onEnd: () => Promise<void>
): Response {
  return createUIMessageStreamResponse({
    stream: stream.pipeThrough(
      new TransformStream<UIMessageChunk, UIMessageChunk>({ flush: onEnd })
    ),
  })
}

/** The text of the conversation's last question, for its trace. */
const lastQuestion = (messages: ReadonlyArray<ChatMessage>) =>
  // Searched from the end by hand: the web app's target has no findLast.
  [...messages]
    .reverse()
    .find((message) => message.role === "user")
    ?.parts.flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join(" ") ?? ""

/**
 * A question answered (spec 010, Approach): lookups stream as they finish
 * (FR-004); the answer is held until every file it names is in the
 * analysis, asked for once more if not (FR-006, plan D-04); with no lookup
 * made, nothing is answered (FR-007). One traced run holds the question's
 * model calls and lookups (FR-010).
 */
export function answerQuestion(
  analysis: ChatAnalysis,
  messages: ReadonlyArray<ChatMessage>,
  deps: ChatDeps
): ReadableStream<UIMessageChunk> {
  return createUIMessageStream<ChatMessage>({
    execute: async ({ writer }) => {
      writer.write({ type: "start" })
      const answer = deps.traced(
        "chat-question",
        // Its argument is what LangSmith records as the run's input.
        (_input: { repository: string; question: string }) =>
          ask(analysis, messages, deps, writer)
      )
      const outcome = await answer({
        repository: analysis.input.repository,
        question: lastQuestion(messages),
      })
      writer.write({ type: "data-outcome", data: outcome })
    },
    onError: () => "The answer couldn't be written. Try again later.",
  })
}

async function ask(
  analysis: ChatAnalysis,
  messages: ReadonlyArray<ChatMessage>,
  deps: ChatDeps,
  writer: UIMessageStreamWriter<ChatMessage>
): Promise<ChatOutcome> {
  const count: LookupCount = { made: 0, stopped: false }
  const system = chatSystemPrompt(analysis.input.repository)
  const history = await keptHistory(messages)

  let first
  try {
    first = await generateText({
      model: deps.model,
      system,
      messages: history,
      tools: lookupTools(analysis, deps, count, writer),
      stopWhen: isStepCount(MAX_STEPS),
      // FR-005: once the lookups are spent, or the steps nearly are, none
      // is offered, and the model is told to answer and say it stopped.
      prepareStep: ({ stepNumber }) =>
        count.made >= MAX_LOOKUPS || stepNumber >= MAX_STEPS - 1
          ? { activeTools: [], system: system + LIMIT_NOTE }
          : undefined,
      maxRetries: 0,
      providerOptions: MODEL_OPTIONS,
    })
  } catch (error) {
    if (isLimited(error)) return { kind: "limited" }
    throw error
  }
  // FR-007: whatever the model wrote, nothing it looked up is behind it.
  if (count.made === 0) return { kind: "declined" }

  let text = first.text
  let absent = ungroundedPaths(text, analysis.paths)
  if (absent.length > 0) {
    // The one retry answers from the same lookups, with none offered.
    try {
      const retry = await generateText({
        model: deps.model,
        system,
        messages: [
          ...history,
          ...first.responseMessages,
          { role: "user", content: ungroundedNote(absent) },
        ],
        maxRetries: 0,
        providerOptions: MODEL_OPTIONS,
      })
      text = retry.text
      absent = ungroundedPaths(text, analysis.paths)
    } catch (error) {
      if (isLimited(error)) return { kind: "limited" }
      throw error
    }
  }
  if (absent.length > 0 || text.trim() === "") return { kind: "ungrounded" }

  writer.write({ type: "text-start", id: "answer" })
  writer.write({ type: "text-delta", id: "answer", delta: text })
  writer.write({ type: "text-end", id: "answer" })
  return {
    kind: "answered",
    stopped:
      count.stopped ||
      count.made >= MAX_LOOKUPS ||
      first.steps.length >= MAX_STEPS,
  }
}
