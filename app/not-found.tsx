import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/shadcn-ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/shadcn-ui/empty";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex flex-1 p-4">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>
            <h1>Page not found</h1>
          </EmptyTitle>
          <EmptyDescription>There is nothing at this address.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {/* A styled Link, not Button: Base UI's Button always sets
              role="button", which would hide the link role. */}
          <Link
            href="/"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Return home
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  );
}
