import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Sign up" };

export default function SignUpPage() {
  // <SignUp> reads the URL in the browser; Cache Components needs that behind
  // a Suspense boundary so the page shell can still prerender.
  return (
    <Suspense>
      <SignUp />
    </Suspense>
  );
}
