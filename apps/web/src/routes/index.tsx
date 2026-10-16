import { Link, createFileRoute } from "@tanstack/react-router"

import { buttonVariants } from "@workspace/ui/components/shadcn-ui/button"

import { ThemeToggle } from "@/components/theme/theme-toggle"
import { SITE, seo, websiteJsonLd } from "@/lib/site"
import { SAMPLES } from "@/sample/samples"

export const Route = createFileRoute("/")({
  head: () => ({
    ...seo({ title: SITE.title, description: SITE.description, path: "/" }),
    // The site's name for Google, on the home page only.
    scripts: [websiteJsonLd()],
  }),
  component: Home,
})

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
        <h2 className="font-medium">Sample maps</h2>
        <ul className="flex flex-col">
          {SAMPLES.map((sample) => (
            <li key={sample.name}>
              <Link
                to="/sample/$name"
                params={{ name: sample.name }}
                className={buttonVariants({
                  variant: "link",
                  className: "px-0 font-mono",
                })}
              >
                {sample.repository}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
