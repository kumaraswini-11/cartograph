// Client component on purpose: Clerk's client <Show> reads auth state in the
// browser, so the root layout stays in the static shell. The server <Show>
// awaits auth(), which Cache Components rejects outside a <Suspense> boundary.
"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

import { Button } from "@/components/shadcn-ui/button";

export function AuthControls() {
  return (
    <div className="flex items-center gap-2">
      <Show when="signed-out">
        {/* Clerk clones its child and attaches onClick, which Button forwards. */}
        <SignInButton>
          <Button variant="outline" size="sm">
            Sign in
          </Button>
        </SignInButton>
        <SignUpButton>
          <Button size="sm">Sign up</Button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </div>
  );
}
