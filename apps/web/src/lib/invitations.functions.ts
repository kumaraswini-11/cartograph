import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

import { sendInvitation } from "./invitations.server"

/** Invites an email address into the current organization (FR-007). */
export const inviteMember = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.email() }))
  .handler(({ data }) => sendInvitation(data.email))
