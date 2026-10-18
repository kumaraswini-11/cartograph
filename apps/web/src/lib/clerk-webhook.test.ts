import { createHmac, randomUUID } from "node:crypto"
import { describe, expect, it, vi } from "vitest"

import { handleClerkWebhook } from "./clerk-webhook.server"

// A signing secret in Clerk's format: whsec_ and a base64 key.
const SECRET = `whsec_${Buffer.from("a test signing key, 24b!").toString("base64")}`

/**
 * A notice signed as Clerk signs them (Svix): HMAC-SHA256, keyed with the
 * secret's decoded key, over "id.timestamp.body".
 */
function notice(event: unknown, secret = SECRET) {
  const body = JSON.stringify(event)
  const id = `msg_${randomUUID()}`
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const key = Buffer.from(secret.slice("whsec_".length), "base64")
  const signature = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64")
  return new Request("https://app.test/api/webhooks/clerk", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": `v1,${signature}`,
    },
    body,
  })
}

const deleted = (id: string) => ({
  type: "organization.deleted",
  object: "event",
  data: { id, object: "organization", deleted: true },
})

/** The webhook's actions, each recording its calls. */
const actions = () => ({
  signingSecret: SECRET,
  deleteOrganization: vi.fn((_: string) => Promise.resolve()),
  signedIn: vi.fn((_: unknown) => Promise.resolve()),
})

describe("Clerk's notices (spec 007, FR-002, plan D-07)", () => {
  it("deletes the organization a signed organization.deleted names", async () => {
    const act = actions()
    const response = await handleClerkWebhook(notice(deleted("org_gone")), act)
    expect(response.status).toBe(204)
    expect(act.deleteOrganization).toHaveBeenCalledWith("org_gone")
    expect(act.signedIn).not.toHaveBeenCalled()
  })

  it("refuses a notice signed with another secret, and deletes nothing", async () => {
    const act = actions()
    const forged = `whsec_${Buffer.from("not Clerk's key at all!!").toString("base64")}`
    const response = await handleClerkWebhook(
      notice(deleted("org_gone"), forged),
      act
    )
    expect(response.status).toBe(400)
    expect(act.deleteOrganization).not.toHaveBeenCalled()
  })

  it("acknowledges and ignores every other notice", async () => {
    const act = actions()
    const response = await handleClerkWebhook(
      notice({ type: "user.created", object: "event", data: { id: "user_1" } }),
      act
    )
    expect(response.status).toBe(204)
    expect(act.deleteOrganization).not.toHaveBeenCalled()
    expect(act.signedIn).not.toHaveBeenCalled()
  })

  it("sends a started session as a sign-in (spec 012, FR-002)", async () => {
    const act = actions()
    const response = await handleClerkWebhook(
      notice({
        type: "session.created",
        object: "event",
        data: {
          id: "sess_1",
          object: "session",
          user_id: "user_1",
          last_active_organization_id: "org_a",
        },
      }),
      act
    )
    expect(response.status).toBe(204)
    expect(act.signedIn).toHaveBeenCalledExactlyOnceWith({
      userId: "user_1",
      organizationId: "org_a",
    })
  })

  it("lets a failed delete fail, so Clerk delivers the notice again", async () => {
    await expect(
      handleClerkWebhook(notice(deleted("org_gone")), {
        ...actions(),
        deleteOrganization: () => Promise.reject(new Error("storage down")),
      })
    ).rejects.toThrow("storage down")
  })
})
