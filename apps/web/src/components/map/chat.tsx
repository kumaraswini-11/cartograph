import { createContext, use, useState } from "react"
import type { ReactNode } from "react"
import type { Chat } from "@ai-sdk/react"

import type { ChatMessage } from "@workspace/ai"

/**
 * Where the map's conversation is held: its analysis, and a slot the Chat
 * tab fills on first use. Only types are imported here, so the chat's code
 * loads with the tab, not with the page.
 */
export type ChatHolder = {
  analysisId: string
  scope: string
  held: { chat?: Chat<ChatMessage> }
}

const ChatContext = createContext<ChatHolder | null>(null)

/**
 * The map's conversation (spec 010, FR-012): one for the page's life,
 * beside the map's state, so switching tabs keeps it, and never stored.
 * Another analysis, or a re-run that stores a new commit, starts a new
 * one: the old was about another map.
 */
export function ChatProvider({
  analysisId,
  commit,
  children,
}: {
  analysisId: string
  /** The stored result's commit. */
  commit: string
  children: ReactNode
}) {
  const scope = `${analysisId}@${commit}`
  const [holder, setHolder] = useState<ChatHolder>(() => ({
    analysisId,
    scope,
    held: {},
  }))
  // A new scope starts afresh as the page renders (React: "Adjusting some
  // state when a prop changes").
  if (holder.scope !== scope) setHolder({ analysisId, scope, held: {} })
  return <ChatContext value={holder}>{children}</ChatContext>
}

/** Where the map's conversation is held, or null with no analysis. */
export function useChatHolder(): ChatHolder | null {
  return use(ChatContext)
}
