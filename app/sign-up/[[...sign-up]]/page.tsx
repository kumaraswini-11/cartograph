import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      {/* <SignUp> reads the URL in the browser; Cache Components needs that
          behind a Suspense boundary so the page shell can still prerender. */}
      <Suspense>
        <SignUp />
      </Suspense>
    </div>
  );
}
