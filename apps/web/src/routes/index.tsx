import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({ component: Home })

function Home() {
  return (
    <main className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-2 text-sm leading-loose">
        <h1 className="font-medium">Cartograph</h1>
        <p>
          A dependency map of any public TypeScript or JavaScript repository,
          drawn from the code itself.
        </p>
      </div>
    </main>
  )
}
