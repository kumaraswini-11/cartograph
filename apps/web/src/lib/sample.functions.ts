import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"

import { readSampleMap } from "./sample.server"
import { SAMPLE_NAMES } from "@/sample/samples"

/** A sample map's input, by name. Public data: no session to check. */
export const getSampleMap = createServerFn({ method: "GET" })
  .validator(z.object({ name: z.enum(SAMPLE_NAMES) }))
  .handler(({ data }) => readSampleMap(data.name))
