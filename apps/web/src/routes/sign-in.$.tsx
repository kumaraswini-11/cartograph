import { ClerkLoaded, ClerkLoading, SignIn } from "@clerk/tanstack-react-start"
import { createFileRoute } from "@tanstack/react-router"

import { Skeleton } from "@workspace/ui/components/shadcn-ui/skeleton"

import { SIGN_IN_PATH } from "@/lib/sign-in"
import { pageTitle, seo } from "@/lib/site"

/**
 * Sign-in, Clerk's own screen (spec 006, C-02): it signs up too, accepts an
 * invitation's ticket (FR-008) and, for a session with no organization yet,
 * asks for one (edge cases). The splat holds its steps (`/sign-in/factor-one`).
 */
export const Route = createFileRoute("/sign-in/$")({
  head: () =>
    seo({
      title: pageTitle("Sign in"),
      description:
        "Sign in to Cartograph with GitHub, Google or your email address.",
      path: SIGN_IN_PATH,
    }),
  component: SignInPage,
})

function SignInPage() {
  return (
    <main className="grid min-h-svh place-items-center p-4">
      {/* Clerk's screen, which brings the page's <h1>, draws once its script
          loads; until then, a card of its size holds the place, alone on
          the page, so nothing moves. */}
      <ClerkLoading>
        <Skeleton
          role="status"
          aria-label="Loading sign-in"
          className="h-[30rem] w-[25rem] max-w-full rounded-xl motion-reduce:animate-none"
        />
      </ClerkLoading>
      <ClerkLoaded>
        {/* One flow: an email with no account goes on to sign up here. */}
        <SignIn withSignUp />
      </ClerkLoaded>
    </main>
  )
}
