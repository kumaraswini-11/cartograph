import { createServerFn } from "@tanstack/react-start"

import { readSession } from "./session.server"

/** The signed-in person and their current organization, or signed out. */
export const getSession = createServerFn({ method: "GET" }).handler(() =>
  readSession()
)
