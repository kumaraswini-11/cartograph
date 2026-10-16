import { afterEach, describe, expect, it } from "vitest"

import { cleanUp, detected, manifest, roles } from "../../testing.ts"

afterEach(cleanUp)

describe("Express (FR-012, FR-018, AC-05)", () => {
  it("gives singular and plural folders the same roles, and no routes", () => {
    const result = detected({
      "package.json": manifest(["express"]),
      "src/index.js":
        'const app = require("./app")\napp.listen(3000, () => {})',
      "src/app.js":
        'const express = require("express")\nconst app = express()\napp.get("/users", (req, res) => res.send())\nmodule.exports = app',
      "src/routes/v1/user.route.js": "",
      "src/route/admin.js": "",
      "src/controllers/user.controller.js": "",
      "src/controller/admin.js": "",
      "src/services/user.service.js": "",
      "src/models/user.model.js": "",
      "src/validations/user.validation.js": "",
      "src/middlewares/auth.js": "",
      "src/config/config.js": "",
      "src/utils/catchAsync.js": "",
    })
    expect(result.packages).toEqual([
      { path: "", framework: "Express", routesRecovered: false },
    ])
    expect(roles(result)).toEqual([
      ["src/app.js", "Unidentified", false],
      ["src/config/config.js", "Configuration", false],
      ["src/controller/admin.js", "Controllers", false],
      ["src/controllers/user.controller.js", "Controllers", false],
      ["src/index.js", "Unidentified", true],
      ["src/middlewares/auth.js", "Middleware", false],
      ["src/models/user.model.js", "Models", false],
      ["src/route/admin.js", "Routes", false],
      ["src/routes/v1/user.route.js", "Routes", false],
      ["src/services/user.service.js", "Services", false],
      ["src/utils/catchAsync.js", "Utilities", false],
      ["src/validations/user.validation.js", "Validations", false],
    ])
    expect(result.routes).toEqual([])
  })

  it("is NestJS, first in order, when a package declares both (FR-002)", () => {
    const result = detected({
      "package.json": manifest(["express", "@nestjs/core"]),
      "a.ts": "",
    })
    expect(result.packages).toEqual([
      { path: "", framework: "NestJS", routesRecovered: true },
    ])
  })
})
