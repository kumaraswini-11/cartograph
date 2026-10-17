import {
  ClerkLoaded,
  ClerkLoading,
  OrganizationSwitcher,
  UserButton,
} from "@clerk/tanstack-react-start"
import { Link } from "@tanstack/react-router"

import { Skeleton } from "@workspace/ui/components/shadcn-ui/skeleton"

import { ThemeToggle } from "@/components/theme/theme-toggle"
import { AFTER_SIGN_IN_PATH } from "@/lib/sign-in"

/** Where the switcher's "Manage" goes: this app's page, not Clerk's (D-06). */
const ORGANIZATION_PATH = "/organization"

/**
 * The signed-in pages' header: the app's name, the organization switcher
 * (spec 006, FR-006), the theme and the person's account menu (Clerk's,
 * which signs out). Clerk's controls draw once its script loads; boxes of
 * their height hold the place until then, so the header never shifts (plan
 * D-05). Switching or creating an organization goes back to the dashboard,
 * whose loader reads the new token.
 */
export function AccountHeader() {
  return (
    <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Link to="/" className="text-sm font-medium">
          Cartograph
        </Link>
        <span aria-hidden className="text-muted-foreground">
          /
        </span>
        <div className="flex h-8 min-w-0 items-center">
          <ClerkLoading>
            <Skeleton className="h-7 w-40 motion-reduce:animate-none" />
          </ClerkLoading>
          <ClerkLoaded>
            <OrganizationSwitcher
              hidePersonal
              afterSelectOrganizationUrl={AFTER_SIGN_IN_PATH}
              afterCreateOrganizationUrl={AFTER_SIGN_IN_PATH}
              afterLeaveOrganizationUrl={AFTER_SIGN_IN_PATH}
              organizationProfileMode="navigation"
              organizationProfileUrl={ORGANIZATION_PATH}
            />
          </ClerkLoaded>
        </div>
      </div>
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
