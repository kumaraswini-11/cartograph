import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  // <SignIn> reads the URL in the browser; Cache Components needs that behind
  // a Suspense boundary so the page shell can still prerender.
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}
