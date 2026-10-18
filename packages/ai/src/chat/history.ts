import type { UIMessage } from "ai"

import { KEPT_QUESTIONS } from "./limits.ts"

/**
 * The conversation as it's sent with a new question (spec 010, plan D-06):
 * the last `KEPT_QUESTIONS` questions and answers and the new question, text
 * only. Earlier lookups' results are dropped: the answers stand for them,
 * and the model looks up again what it needs. One source for the browser,
 * which sends no more than this, and the server, which reads no more.
 * Browser-safe, at `@workspace/ai/chat/history`.
 */
export function recentText<TMessage extends UIMessage>(
  messages: ReadonlyArray<TMessage>
): Array<TMessage> {
  return messages
    .slice(-(KEPT_QUESTIONS * 2 + 1))
    .map((message) => ({
      ...message,
      parts: message.parts.filter((part) => part.type === "text"),
    }))
    .filter((message) => message.parts.length > 0)
}
