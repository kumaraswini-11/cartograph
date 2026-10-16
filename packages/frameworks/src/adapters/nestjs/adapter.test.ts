import { afterEach, describe, expect, it } from "vitest"

import { cleanUp, detected, manifest, roles, routes } from "../../testing.ts"

afterEach(cleanUp)

const NEST = manifest(["@nestjs/core", "@nestjs/common", "express"])

const bootstrap = (setup = "") => `
import { NestFactory } from "@nestjs/core"
import { VersioningType, RequestMethod } from "@nestjs/common"
import { AppModule } from "./app.module"
async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  ${setup}
  await app.listen(3000)
}
bootstrap()
`

const controller = (decorator: string, methods: string) => `
import { Controller, Get, Post, Delete, All, Version } from "@nestjs/common"
${decorator}
export class ArticlesController {
${methods}
}
`

describe("roles (FR-011)", () => {
  it("reads the file-name suffix first, then the class decorator", () => {
    const result = detected({
      "package.json": NEST,
      "src/main.ts": bootstrap(),
      "src/app.module.ts":
        'import { Module } from "@nestjs/common"\n@Module({})\nexport class AppModule {}',
      "src/users/users.controller.ts": "",
      "src/users/users.service.ts": "",
      "src/users/dto/create-user.dto.ts": "",
      "src/auth/jwt.guard.ts":
        'import { Injectable } from "@nestjs/common"\n@Injectable()\nexport class JwtGuard {}',
      "src/mail/mailer.ts":
        'import { Injectable } from "@nestjs/common"\n@Injectable()\nexport class Mailer {}',
      "src/user.ts":
        'import { Entity } from "typeorm"\n@Entity()\nexport class User {}',
      "src/own.ts":
        'import { Injectable } from "./decorators"\n@Injectable()\nexport class Own {}',
      "src/users/users.controller.spec.ts": "",
    })
    expect(result.packages).toEqual([
      { path: "", framework: "NestJS", routesRecovered: true },
    ])
    expect(roles(result)).toEqual([
      ["src/app.module.ts", "Modules", false],
      ["src/auth/jwt.guard.ts", "Guards", false],
      ["src/mail/mailer.ts", "Services", false],
      ["src/main.ts", "Unidentified", true],
      ["src/own.ts", "Unidentified", false],
      ["src/user.ts", "Entities", false],
      ["src/users/dto/create-user.dto.ts", "DTOs", false],
      ["src/users/users.controller.spec.ts", "Unidentified", true],
      ["src/users/users.controller.ts", "Controllers", false],
      ["src/users/users.service.ts", "Services", false],
    ])
  })
})

describe("routes (FR-016, FR-017, AC-02, AC-07, AC-13)", () => {
  it("joins the global prefix, the controller and the method", () => {
    const result = detected({
      "package.json": NEST,
      "src/main.ts": bootstrap('app.setGlobalPrefix("api")'),
      "src/articles.controller.ts": controller(
        '@Controller("articles")',
        '  @Get() all() {}\n  @Get(":slug") one() {}\n  @Post() add() {}\n  @Delete([":slug", "by-id/:id"]) remove() {}\n  @All("any") any() {}\n  helper() {}'
      ),
    })
    expect(routes(result)).toEqual([
      "GET /api/articles",
      "POST /api/articles",
      "DELETE /api/articles/:slug",
      "GET /api/articles/:slug",
      "DELETE /api/articles/by-id/:id",
    ])
    expect(result.routes[0]).toMatchObject({
      file: "src/articles.controller.ts",
      line: 5,
    })
  })

  it("adds the URI version from the method, the controller or the default", () => {
    const result = detected({
      "package.json": NEST,
      "src/main.ts": bootstrap(
        'app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" })'
      ),
      "src/a.controller.ts": controller(
        '@Controller({ path: "cats", version: "2" })',
        '  @Get() list() {}\n  @Version("3") @Get("new") latest() {}'
      ),
      "src/b.controller.ts": controller(
        '@Controller("dogs")',
        "  @Get() list() {}"
      ),
    })
    expect(routes(result)).toEqual([
      "GET /v1/dogs",
      "GET /v2/cats",
      "GET /v3/cats/new",
    ])
  })

  it("leaves the path as it is for header versions", () => {
    const result = detected({
      "package.json": NEST,
      "src/main.ts": bootstrap(
        'app.enableVersioning({ type: VersioningType.HEADER, header: "X-V" })'
      ),
      "src/a.controller.ts": controller(
        '@Controller({ path: "cats", version: "2" })',
        "  @Get() list() {}"
      ),
    })
    expect(routes(result)).toEqual(["GET /cats"])
  })

  it("leaves excluded paths without the prefix", () => {
    const result = detected({
      "package.json": NEST,
      "src/main.ts": bootstrap(
        'app.setGlobalPrefix("api", { exclude: [{ path: "health", method: RequestMethod.GET }, "status"] })'
      ),
      "src/a.controller.ts": controller(
        "@Controller()",
        '  @Get("health") health() {}\n  @Post("health") ping() {}\n  @Get("status") status() {}'
      ),
    })
    expect(routes(result)).toEqual([
      "POST /api/health",
      "GET /health",
      "GET /status",
    ])
  })

  it("gives no routes when the prefix is read from configuration (AC-13)", () => {
    const result = detected({
      "package.json": NEST,
      "src/main.ts": bootstrap('app.setGlobalPrefix(config.get("prefix"))'),
      "src/a.controller.ts": controller(
        '@Controller("cats")',
        "  @Get() list() {}"
      ),
    })
    expect(result.routes).toEqual([])
    // The table then says why it's empty (spec 005, FR-012).
    expect(result.packages[0]?.routesRecovered).toBe(false)
  })

  it("gives no route for a path built from a variable (AC-07)", () => {
    const result = detected({
      "package.json": NEST,
      "src/main.ts": bootstrap(),
      "src/paths.ts": 'export const CATS = "cats"',
      "src/a.controller.ts":
        'import { CATS } from "./paths"\n' +
        controller("@Controller(CATS)", "  @Get() list() {}"),
      "src/b.controller.ts": controller(
        '@Controller("dogs")',
        "  @Get(name) one() {}\n  @Get() all() {}"
      ),
    })
    expect(routes(result)).toEqual(["GET /dogs"])
    expect(result.packages[0]?.routesRecovered).toBe(true)
  })

  it("gives no routes when a RouterModule sets prefixes or an exclude has a pattern", () => {
    for (const setup of [
      'RouterModule.register([{ path: "admin", module: AdminModule }])',
      'app.setGlobalPrefix("api", { exclude: ["health/(.*)"] })',
    ]) {
      const result = detected({
        "package.json": NEST,
        "src/main.ts": bootstrap(setup),
        "src/a.controller.ts": controller(
          '@Controller("cats")',
          "  @Get() list() {}"
        ),
      })
      expect(result.routes).toEqual([])
      cleanUp()
    }
  })

  it("reads settings only on the application NestFactory created (plan D-06)", () => {
    const helper = `
import { NestFactory } from "@nestjs/core"
export async function configure(server) { server.setGlobalPrefix("api") }
async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  await configure(app)
}`
    const result = detected({
      "package.json": NEST,
      "src/main.ts": helper,
      "src/a.controller.ts": controller(
        '@Controller("cats")',
        "  @Get() list() {}"
      ),
    })
    // `server` may be the application: no route rather than `/cats` without
    // its prefix.
    expect(result.routes).toEqual([])
  })

  it("ignores decorators that aren't NestJS's own (plan D-05)", () => {
    const result = detected({
      "package.json": NEST,
      "src/main.ts": bootstrap(),
      "src/a.controller.ts":
        'import { Controller, Get } from "./my-decorators"\n@Controller("x")\nexport class X { @Get() a() {} }',
    })
    expect(result.routes).toEqual([])
  })
})
