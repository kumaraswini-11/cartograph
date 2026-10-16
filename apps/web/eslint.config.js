// @ts-check
import { config } from "@workspace/eslint-config"

// Build output: Nitro writes .output/, and .vercel/output/ on Vercel.
export default [...config, { ignores: [".output/", ".vercel/"] }]
