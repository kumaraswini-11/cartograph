// @ts-check
import { config } from "@workspace/eslint-config"

export default [...config, { ignores: [".cache/"] }]
