import Link from "next/link";

import { AuthControls } from "@/components/auth-controls";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="flex h-10 items-center justify-between border-b px-3">
      <Link href="/" className="text-sm font-semibold">
        Cartograph
      </Link>
      {/* Theme toggle sits at the edge: Clerk's controls render nothing until
          Clerk loads, and anything to their right would shift when they appear. */}
      <div className="flex items-center gap-2">
        <AuthControls />
        <ThemeToggle />
      </div>
    </header>
  );
}
