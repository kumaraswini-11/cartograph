import { Link, createFileRoute } from "@tanstack/react-router"

import { Button } from "@workspace/ui/components/shadcn-ui/button"

import { ThemeToggle } from "@/components/theme/theme-toggle"

export const Route = createFileRoute("/")({ component: Home })

function Home() {
  return (
    <main className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-2 text-sm leading-loose">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-medium">Cartograph</h1>
          <ThemeToggle />
        </div>
        <p>
          A dependency map of any public TypeScript or JavaScript repository,
          drawn from the code itself.
        </p>
        <p>
          <Button
            variant="link"
            className="px-0"
            render={<Link to="/sample" />}
          >
            Open the sample map
          </Button>
        </p>
      </div>
    </main>
  )
}
