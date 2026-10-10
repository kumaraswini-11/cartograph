import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      {/* <SignIn> reads the URL in the browser; Cache Components needs that
          behind a Suspense boundary so the page shell can still prerender. */}
      <Suspense>
        <SignIn />
      </Suspense>
    </div>
  );
}
