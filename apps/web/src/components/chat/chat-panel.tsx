import { useId, useRef, useState } from "react"
import { ArrowUpIcon, LoaderCircleIcon, MessagesSquareIcon } from "lucide-react"
import { Chat, useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

import type { ChatMessage, ChatOutcome } from "@workspace/ai"
import { recentText } from "@workspace/ai/chat/history"
import { MAX_LOOKUPS } from "@workspace/ai/chat/limits"
import { EmptyState } from "@workspace/ui/components/empty-state"
import {
  Bubble,
  BubbleContent,
} from "@workspace/ui/components/shadcn-ui/bubble"
import { Button } from "@workspace/ui/components/shadcn-ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@workspace/ui/components/shadcn-ui/input-group"
import {
  Message,
  MessageContent,
} from "@workspace/ui/components/shadcn-ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@workspace/ui/components/shadcn-ui/message-scroller"
import {
  Trace,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@workspace/ui/components/shadcn-ui/trace"

import { Lookup } from "@/components/chat/lookup"
import type { LookupPart } from "@/components/chat/lookup"
import { ExplanationText } from "@/components/detail/explanation-text"
import { PaneScrollContext } from "@/components/detail/file-list"
import { useChatHolder } from "@/components/map/chat"
import { modelCallLimitMessage } from "@/lib/limits"

/** A conversation about one analysis, posting to its chat route (D-02). */
function newChat(analysisId: string): Chat<ChatMessage> {
  return new Chat<ChatMessage>({
    transport: new DefaultChatTransport({
      api: `/api/analyses/${analysisId}/chat`,
      // Only the recent text goes: the server reads no more (plan D-06).
      prepareSendMessagesRequest: ({ messages }) => ({
        body: { messages: recentText(messages) },
      }),
    }),
  })
}

/** The most characters a question may have: a question, not a document. */
const QUESTION_MAX_LENGTH = 1000

/** What each ending says beside, or instead of, an answer. */
function outcomeNote(outcome: ChatOutcome): string | null {
  switch (outcome.kind) {
    case "answered":
      return outcome.stopped
        ? `It stopped after ${MAX_LOOKUPS} lookups, so this may not be complete.`
        : null
    case "declined":
      return "I only answer questions about this analysis, from lookups in it. Try asking about a file, a route or an insight."
    case "ungrounded":
      return "The answer named files that aren't in this repository, so it isn't shown. Try asking another way."
    case "limited":
      return "The model's free request limit is reached. Try again later."
    case "unavailable":
      return "The model is busy right now. Try again in a minute."
    case "paused":
      return modelCallLimitMessage("Answers", outcome.resumesAt)
  }
}

/**
 * The Chat tab (spec 010, FR-004, FR-008, FR-009, FR-011): the
 * conversation, each answer after the lookups it came from, and the
 * question box. The conversation lives beside the map (FR-012), so it
 * survives switching tabs.
 */
export default function ChatPanel() {
  const holder = useChatHolder()
  if (holder === null) {
    return (
      <EmptyState
        icon={<MessagesSquareIcon />}
        title="No chat here"
        description="Chat answers questions about stored analyses."
      />
    )
  }
  // Made on first use, here, so the chat's code loads with the tab; held
  // beside the map, so it outlives the tab (FR-012).
  holder.held.chat ??= newChat(holder.analysisId)
  return <Conversation chat={holder.held.chat} />
}

function Conversation({ chat }: { chat: Chat<ChatMessage> }) {
  const { messages, sendMessage, status, error, regenerate } = useChat({
    chat,
  })
  const busy = status === "submitted" || status === "streaming"
  // Long lists in a lookup scroll with the conversation, as the pane's do.
  const viewport = useRef<HTMLDivElement>(null)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageScrollerProvider autoScroll>
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport
            ref={viewport}
            aria-label="Conversation"
            aria-busy={busy}
          >
            <PaneScrollContext value={viewport}>
              <MessageScrollerContent className="gap-4 p-4">
                {messages.length === 0 && (
                  <EmptyState
                    icon={<MessagesSquareIcon />}
                    title="Ask about this repository"
                    description="Every answer is looked up in this analysis first: what breaks if a file changes, what a file depends on, its routes and its insights."
                  />
                )}
                {messages.map((message) => (
                  <MessageScrollerItem key={message.id} messageId={message.id}>
                    {message.role === "user" ? (
                      <Question message={message} />
                    ) : (
                      <Reply message={message} />
                    )}
                  </MessageScrollerItem>
                ))}
                {status === "submitted" && (
                  <TraceLine status="running">
                    <TraceIcon>
                      <LoaderCircleIcon className="animate-spin motion-reduce:animate-none" />
                    </TraceIcon>
                    <TraceTitle>Choosing lookups</TraceTitle>
                  </TraceLine>
                )}
                {error !== undefined && (
                  <div className="flex flex-col items-start gap-2 text-sm">
                    <p className="text-destructive">
                      The answer couldn&apos;t be fetched.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void regenerate()}
                    >
                      Try again
                    </Button>
                  </div>
                )}
              </MessageScrollerContent>
            </PaneScrollContext>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>
      <QuestionBox busy={busy} onAsk={(text) => void sendMessage({ text })} />
    </div>
  )
}

export function Question({ message }: { message: ChatMessage }) {
  const text = message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n")
  return (
    <Message align="end">
      <MessageContent>
        <Bubble align="end" variant="secondary">
          <BubbleContent className="whitespace-pre-wrap">{text}</BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  )
}

/** An answer: its lookups first (C-02), then the answer and its ending. */
export function Reply({ message }: { message: ChatMessage }) {
  const lookups = message.parts.filter((part): part is LookupPart =>
    part.type.startsWith("tool-")
  )
  const answer = message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n")
  const outcome = message.parts.find((part) => part.type === "data-outcome")
  const note = outcome === undefined ? null : outcomeNote(outcome.data)

  return (
    <Message>
      <MessageContent className="w-full gap-3">
        {lookups.length > 0 && (
          <Trace aria-label="Lookups">
            {lookups.map((part) => (
              <Lookup key={part.toolCallId} part={part} />
            ))}
          </Trace>
        )}
        {answer !== "" && <ExplanationText text={answer} />}
        {note !== null && (
          <p className="text-sm text-muted-foreground">{note}</p>
        )}
      </MessageContent>
    </Message>
  )
}

/**
 * The question box: Enter asks, Shift+Enter starts a new line, and Enter
 * while composing characters only confirms them. Labelled
 * for screen readers; asking waits while an answer is on its way.
 */
function QuestionBox({
  busy,
  onAsk,
}: {
  busy: boolean
  onAsk: (text: string) => void
}) {
  const [text, setText] = useState("")
  const id = useId()
  const question = text.trim()
  const ask = () => {
    if (busy || question === "") return
    onAsk(question)
    setText("")
  }

  return (
    <form
      className="border-t p-2"
      onSubmit={(event) => {
        event.preventDefault()
        ask()
      }}
    >
      <label htmlFor={id} className="sr-only">
        Ask about this repository
      </label>
      <InputGroup>
        <InputGroupTextarea
          id={id}
          value={text}
          maxLength={QUESTION_MAX_LENGTH}
          rows={2}
          // It grows with the question up to about six lines, then scrolls
          // inside, so the conversation and the Ask button stay in view.
          className="max-h-32 overflow-y-auto"
          placeholder="What breaks if a file changes?"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            // Enter while an input method is composing (Japanese, Chinese,
            // Korean) confirms the characters; it never sends.
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault()
              ask()
            }
          }}
        />
        <InputGroupAddon align="block-end" className="justify-end">
          <InputGroupButton
            type="submit"
            variant="default"
            size="icon-sm"
            aria-label="Ask"
            disabled={busy || question === ""}
          >
            <ArrowUpIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
