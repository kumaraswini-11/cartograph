// The samples the app shows until spec 008 stores real analyses: golden
// repositories at their pinned commits, one per framework whose detail the
// pane shows (spec 003 plan D-06, spec 005 plan D-07). One source for the
// script that generates them, the route that serves them and the home page.

export const SAMPLES = [
  {
    name: "taxonomy",
    repository: "shadcn-ui/taxonomy",
    commit: "298a8857c7128a0d121e7f699dfd729f23b3966d",
  },
  {
    name: "nestjs-realworld-example-app",
    repository: "lujakob/nestjs-realworld-example-app",
    commit: "c1c2cc4e448b279ff083272df1ac50d20c3304fa",
  },
  {
    name: "node-express-boilerplate",
    repository: "hagopj13/node-express-boilerplate",
    commit: "179ae84efec61b14206d0305d941daed6c6d07f9",
  },
] as const

export type SampleName = (typeof SAMPLES)[number]["name"]

/** The sample `/sample` leads to. */
export const DEFAULT_SAMPLE: SampleName = "taxonomy"

export const SAMPLE_NAMES = SAMPLES.map((s) => s.name) as [
  SampleName,
  ...Array<SampleName>,
]

export const isSampleName = (name: string): name is SampleName =>
  SAMPLE_NAMES.some((sample) => sample === name)
