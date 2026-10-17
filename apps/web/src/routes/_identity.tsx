import { ClerkProvider } from "@clerk/tanstack-react-start"
import { shadcn } from "@clerk/ui/themes"
import { Outlet, createFileRoute } from "@tanstack/react-router"

import { AFTER_SIGN_IN_PATH, SIGN_IN_PATH } from "@/lib/sign-in"

/**
 * The pages that use identity: sign-in and every signed-in page (spec 006).
 * Clerk's provider sits here rather than at the root, so the pages that
 * don't sign anyone in, home and the samples, never load its script: on
 * Lighthouse's mobile profile it added 344 KB and 273 ms of blocking time
 * to the home page (plan D-05, measured in T04). The layout has no path, so
 * addresses don't change. Sign-in and sign-up are one page, and every
 * sign-in lands on the dashboard (FR-002).
 */
export const Route = createFileRoute("/_identity")({
  component: IdentityLayout,
})

function IdentityLayout() {
  return (
    <ClerkProvider
      appearance={{ theme: shadcn }}
      signInUrl={SIGN_IN_PATH}
      signUpUrl={SIGN_IN_PATH}
      signInFallbackRedirectUrl={AFTER_SIGN_IN_PATH}
      signUpFallbackRedirectUrl={AFTER_SIGN_IN_PATH}
      afterSignOutUrl="/"
    >
      <Outlet />
    </ClerkProvider>
  )
}
