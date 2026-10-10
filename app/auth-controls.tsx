// Client component on purpose: Clerk's client <Show> reads auth state in the
// browser, so the root layout stays in the static shell. The server <Show>
// awaits auth(), which Cache Components rejects outside a <Suspense> boundary.
"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

const button =
  "rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900";

export function AuthControls() {
  return (
    <div className="flex items-center gap-2">
      <Show when="signed-out">
        <SignInButton>
          <button type="button" className={button}>
            Sign in
          </button>
        </SignInButton>
        <SignUpButton>
          <button type="button" className={button}>
            Sign up
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </div>
  );
}
