import {
  ClerkLoaded,
  ClerkLoading,
  UserButton,
} from "@clerk/tanstack-react-start"
import { Link } from "@tanstack/react-router"

import { Skeleton } from "@workspace/ui/components/shadcn-ui/skeleton"

import { ThemeToggle } from "@/components/theme/theme-toggle"

/**
 * The signed-in pages' header: the app's name, the theme and the person's
 * account menu (Clerk's, which signs out). Clerk's button draws once its
 * script loads; a box of its size holds the place until then, so the header
 * never shifts (spec 006 plan D-05).
 */
export function AccountHeader() {
  return (
    <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
      <Link to="/" className="text-sm font-medium">
        Cartograph
      </Link>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div className="flex size-8 items-center justify-center">
          <ClerkLoading>
            <Skeleton className="size-7 rounded-full motion-reduce:animate-none" />
          </ClerkLoading>
          <ClerkLoaded>
            <UserButton />
          </ClerkLoaded>
        </div>
      </div>
    </header>
  )
}
