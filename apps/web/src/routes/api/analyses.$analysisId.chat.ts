import { createFileRoute } from "@tanstack/react-router"

import { handleChat } from "@/lib/chat.server"

/**
 * An analysis's chat (spec 010, plan D-02): `useChat` posts the
 * conversation here and reads the answer as a stream. The CSRF middleware
 * covers it (D-03), and the handler reads the session itself.
 */
export const Route = createFileRoute("/api/analyses/$analysisId/chat")({
  server: {
    handlers: {
      POST: ({ request, params }) => handleChat(request, params.analysisId),
    },
  },
})
