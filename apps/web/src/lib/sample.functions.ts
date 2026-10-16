import { createServerFn } from "@tanstack/react-start"

import { readSampleMap } from "./sample.server"

/** The sample map's input. Public data: no session to check. */
export const getSampleMap = createServerFn({ method: "GET" }).handler(() =>
  readSampleMap()
)
