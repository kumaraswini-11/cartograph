// `pnpm --filter web clerk:check`: spec 006's AC-06 and AC-08, checked
// against Clerk's development instance itself (plan D-09), as the golden
// scripts check the parser against real repositories. A throwaway test user
// with two organizations signs in as a browser would, with a one-time
// sign-in token; its session token's claims are read, the other
// organization is made current and they're read again. Then the instance's
// roles are listed. Everything it makes is deleted at the end. Development
// keys only: it refuses a production instance.
import { randomUUID } from "node:crypto"

import { createClerkClient } from "@clerk/backend"

const secretKey = process.env.CLERK_SECRET_KEY ?? ""
const publishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY ?? ""
if (
  !secretKey.startsWith("sk_test_") ||
  !publishableKey.startsWith("pk_test_")
) {
  throw new Error(
    "clerk:check runs only against a development instance: set the sk_test_ and pk_test_ keys in apps/web/.env.local."
  )
}

const clerk = createClerkClient({ secretKey })
// The instance's Frontend API, which the publishable key names.
const frontendApi = `https://${Buffer.from(publishableKey.slice("pk_test_".length), "base64").toString().replace(/\$$/, "")}`

type Claims = { o?: { id: string; rol: string }; org_name?: string }
const decode = (jwt: string): Claims =>
  JSON.parse(Buffer.from(jwt.split(".")[1] ?? "", "base64url").toString())

/**
 * A browser's client on the development instance. A development instance
 * keeps a browser's client by a dev-browser token rather than a cookie,
 * which is how Clerk's own browser script talks to it.
 */
async function browser() {
  const devBrowser = await (
    await fetch(`${frontendApi}/v1/dev_browser`, { method: "POST" })
  ).json()
  return async (path: string, form?: Record<string, string>) => {
    const response = await fetch(
      `${frontendApi}/v1${path}?__clerk_db_jwt=${devBrowser.token ?? devBrowser.id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(form).toString(),
      }
    )
    if (!response.ok) throw new Error(`${path}: ${await response.text()}`)
    return response.json()
  }
}

/** The instance's organization roles, from the Backend API. */
async function roles(): Promise<Array<string>> {
  const response = await fetch("https://api.clerk.com/v1/organization_roles", {
    headers: { Authorization: `Bearer ${secretKey}` },
  })
  const body = await response.json()
  return (body.data as Array<{ key: string }>).map((r) => r.key).sort()
}

const results: Array<{ check: string; pass: boolean; detail: string }> = []
const check = (name: string, pass: boolean, detail: string) =>
  results.push({ check: name, pass, detail })

const id = randomUUID().slice(0, 8)
const user = await clerk.users.createUser({
  emailAddress: [`clerk-check-${id}+clerk_test@example.com`],
  firstName: "Check",
  skipPasswordRequirement: true,
})
const made: Array<string> = []
try {
  // Each kept for deleting as soon as it exists, so a failure leaves nothing.
  const organization = async (name: string) => {
    const created = await clerk.organizations.createOrganization({
      name,
      createdBy: user.id,
    })
    made.push(created.id)
    return created
  }
  const first = await organization(`First ${id}`)
  const second = await organization(`Second ${id}`)

  const call = await browser()
  const { token } = await clerk.signInTokens.createSignInToken({
    userId: user.id,
    expiresInSeconds: 300,
  })
  const signIn = await call("/client/sign_ins", {
    strategy: "ticket",
    ticket: token,
  })
  const sessionId: string = signIn.response.created_session_id
  const claimsWith = async (organizationId: string) => {
    await call(`/client/sessions/${sessionId}/touch`, {
      active_organization_id: organizationId,
    })
    return decode((await call(`/client/sessions/${sessionId}/tokens`)).jwt)
  }

  const before = await claimsWith(first.id)
  check(
    "AC-06: the token carries the current organization",
    before.o?.id === first.id && before.org_name === first.name,
    `o.id=${before.o?.id} org_name=${before.org_name}`
  )
  const after = await claimsWith(second.id)
  check(
    "AC-06: switching organization changes the claim",
    after.o?.id === second.id && after.org_name === second.name,
    `o.id=${after.o?.id} org_name=${after.org_name}`
  )

  const keys = await roles()
  check(
    "AC-08: the identity provider's default roles only",
    keys.join() === "org:admin,org:member",
    keys.join(", ")
  )
} finally {
  for (const organizationId of made) {
    await clerk.organizations.deleteOrganization(organizationId)
  }
  await clerk.users.deleteUser(user.id)
}

for (const { check: name, pass, detail } of results) {
  console.log(`${pass ? "ok  " : "FAIL"}  ${name}  (${detail})`)
}
if (results.some((r) => !r.pass)) process.exitCode = 1
