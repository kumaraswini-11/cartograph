// NestJS: roles from file-name suffixes and decorators, the bootstrap file
// as entry point, and routes joined from the global prefix, the version, and
// the controller's and method's paths (spec 002, FR-011, FR-014, FR-016).
// See https://docs.nestjs.com/controllers, /faq/global-prefix and
// /techniques/versioning.

import { Visitor } from "oxc-parser"
import type { Program } from "oxc-parser"

import type { Adapter, PackageInput } from "../../adapter.ts"
import { isTestFile, stemOf } from "../../conventions.ts"
import { localPath } from "../../packages.ts"
import type { HttpMethod, Route } from "../../result.ts"
import {
  importedNames,
  literalList,
  literalValue,
  memberCalls,
  property,
} from "../../syntax.ts"
import type { Node, ParsedFile } from "../../syntax.ts"
import { taxonomy } from "./taxonomy.ts"

const COMMON = "@nestjs/common"

/** `users.controller.ts` → Controllers (FR-011). */
const SUFFIX_ROLES: Record<string, string> = {
  controller: "Controllers",
  gateway: "Gateways",
  resolver: "Resolvers",
  service: "Services",
  module: "Modules",
  entity: "Entities",
  dto: "DTOs",
  guard: "Guards",
  interceptor: "Interceptors",
  pipe: "Pipes",
  filter: "Filters",
  middleware: "Middleware",
}

/** Class decorators by the package they come from (plan D-05). */
const DECORATOR_ROLES: ReadonlyArray<[RegExp, string, string]> = [
  [/^@nestjs\/common$/, "Controller", "Controllers"],
  [/^@nestjs\/websockets$/, "WebSocketGateway", "Gateways"],
  [/^@nestjs\/graphql$/, "Resolver", "Resolvers"],
  [/^@nestjs\/common$/, "Module", "Modules"],
  [/^(typeorm|@mikro-orm\/core)$/, "Entity", "Entities"],
  [/^@nestjs\/common$/, "Injectable", "Services"],
]

/** Method decorators that bind one HTTP method; `@All` binds none. */
const METHOD_DECORATORS: Record<string, HttpMethod> = {
  Get: "GET",
  Post: "POST",
  Put: "PUT",
  Patch: "PATCH",
  Delete: "DELETE",
  Head: "HEAD",
  Options: "OPTIONS",
}

const NEUTRAL = Symbol("VERSION_NEUTRAL")
type Version = string | typeof NEUTRAL

/** The application's routing settings, or undefined when not all literal. */
type Settings = {
  prefix: string
  /** Paths, and their method if one is named, that skip the prefix. */
  exclude: Array<{ path: string; method: HttpMethod | undefined }>
  versioning:
    { prefix: string; defaults: Array<Version> | undefined } | undefined
}

const trim = (path: string) => path.replace(/^\/+|\/+$/g, "")
const join = (...parts: Array<string>) =>
  `/${parts
    .map(trim)
    .filter((p) => p !== "")
    .join("/")}`

/** A decorator's or call's callee as an imported name, if it is one. */
type Imports = ReturnType<typeof importedNames>
const calleeOf = (expression: Node | undefined, imports: Imports) => {
  if (expression?.type !== "CallExpression") return undefined
  const callee = expression.callee as Node & { name?: string }
  if (callee.type !== "Identifier" || callee.name === undefined)
    return undefined
  return imports.get(callee.name)
}

type Decorated = { decorators?: Array<{ expression: Node; start: number }> }

/** The classes a program declares, exported or not. */
function classesOf(program: Program): Array<Node & Decorated> {
  const classes: Array<Node & Decorated> = []
  for (const statement of program.body as Array<Node>) {
    const declaration =
      statement.type === "ExportNamedDeclaration" ||
      statement.type === "ExportDefaultDeclaration"
        ? (statement.declaration as Node | null)
        : statement
    if (declaration?.type === "ClassDeclaration") {
      classes.push(declaration)
    }
  }
  return classes
}

/** A role from a class decorator, when the file name names none. */
function decoratorRole(file: ParsedFile): string | undefined {
  const imports = importedNames(file.program)
  for (const [source, name, role] of DECORATOR_ROLES) {
    for (const cls of classesOf(file.program)) {
      for (const decorator of cls.decorators ?? []) {
        const imported = calleeOf(decorator.expression, imports)
        if (imported?.imported === name && source.test(imported.source)) {
          return role
        }
      }
    }
  }
  return undefined
}

const argumentsOf = (call: Node) => call.arguments as Array<Node>

/** Whether a program uses RouterModule, which sets path prefixes per module. */
function usesRouterModule(program: Program): boolean {
  const uses: Array<Node> = []
  new Visitor({
    MemberExpression(node) {
      const object = node.object as Node & { name?: string }
      if (object.type === "Identifier" && object.name === "RouterModule") {
        uses.push(object)
      }
    },
  }).visit(program)
  return uses.length > 0
}

/** A `RequestMethod.GET` member, as a method; undefined for anything else. */
function requestMethod(node: Node | undefined): HttpMethod | "ALL" | undefined {
  if (node?.type !== "MemberExpression") return undefined
  const name = (node.property as Node & { name?: string }).name
  if (name === "ALL") return "ALL"
  return Object.values(METHOD_DECORATORS).find((m) => m === name)
}

/** A version value: a literal, a literal list, or `VERSION_NEUTRAL`. */
function versionsOf(node: Node | undefined): Array<Version> | undefined {
  if (node?.name === "VERSION_NEUTRAL") {
    return [NEUTRAL]
  }
  if (node?.type === "ArrayExpression") {
    const items = (node.elements as Array<Node | null>).map((e) =>
      versionsOf(e ?? undefined)
    )
    return items.every((i) => i !== undefined) ? items.flat() : undefined
  }
  const value = literalValue(node)
  return value === undefined ? undefined : [value]
}

/**
 * The package's global prefix, its exclusions and its versioning, read
 * outside tests (plan D-06). Undefined when any is set to a value that isn't
 * a literal, or a RouterModule adds path prefixes per module.
 */
function settingsOf(pkg: PackageInput): Settings | undefined {
  const prefixes = new Set<string>()
  const exclude: Settings["exclude"] = []
  let versioning: Settings["versioning"]

  for (const path of pkg.files) {
    if (isTestFile(localPath(pkg, path))) continue
    const file = pkg.syntax(path)
    if (!file) continue

    if (usesRouterModule(file.program)) return undefined

    // Read only on the application `NestFactory` created. A call on anything
    // else might still be the application, so it gives no routes rather
    // than routes that could miss its prefix (plan D-06).
    const applications = applicationNames(file)
    const onApplication = (call: Node) => {
      const object = (call.callee as Node).object as Node & { name?: string }
      return object.type === "Identifier" && applications.has(object.name ?? "")
    }
    const settingCalls = [
      ...memberCalls(file.program, "setGlobalPrefix"),
      ...memberCalls(file.program, "enableVersioning"),
    ]
    if (!settingCalls.every(onApplication)) return undefined

    for (const call of memberCalls(file.program, "setGlobalPrefix")) {
      const [value, options] = argumentsOf(call)
      const prefix = literalValue(value)
      if (prefix === undefined) return undefined
      prefixes.add(trim(prefix))
      if (options === undefined) continue
      const list = property(options, "exclude")
      if (list === undefined) continue
      if (list.type !== "ArrayExpression") return undefined
      for (const item of list.elements as Array<Node>) {
        const itemPath =
          literalValue(item) ?? literalValue(property(item, "path"))
        if (itemPath === undefined || /[*(:]/.test(itemPath)) return undefined
        const method =
          item.type === "ObjectExpression"
            ? requestMethod(property(item, "method"))
            : "ALL"
        if (method === undefined) return undefined
        exclude.push({
          path: trim(itemPath),
          method: method === "ALL" ? undefined : method,
        })
      }
    }

    for (const call of memberCalls(file.program, "enableVersioning")) {
      const [options] = argumentsOf(call)
      const type = property(options, "type")
      if (type?.type !== "MemberExpression") return undefined
      // Header and media-type versions leave the path as it is.
      const typeName = (type.property as { name?: string } | undefined)?.name
      if (typeName !== "URI") continue
      const prefixNode = property(options, "prefix")
      const versionPrefix =
        prefixNode === undefined
          ? "v"
          : prefixNode.type === "Literal" && prefixNode.value === false
            ? ""
            : literalValue(prefixNode)
      if (versionPrefix === undefined) return undefined
      const defaultNode = property(options, "defaultVersion")
      const defaults =
        defaultNode === undefined ? undefined : versionsOf(defaultNode)
      if (defaultNode !== undefined && defaults === undefined) return undefined
      versioning = { prefix: versionPrefix, defaults }
    }
  }
  if (prefixes.size > 1) return undefined
  const [prefix = ""] = prefixes
  return { prefix, exclude, versioning }
}

/** A controller's paths and version, when all of them are literals. */
function controllerOf(decorator: Node) {
  const [argument] = argumentsOf(decorator)
  if (argument === undefined) return { paths: [""], versions: undefined }
  if (argument.type === "ObjectExpression") {
    const pathNode = property(argument, "path")
    const paths = pathNode === undefined ? [""] : literalList(pathNode)
    const versionNode = property(argument, "version")
    const versions =
      versionNode === undefined ? undefined : versionsOf(versionNode)
    if (!paths || (versionNode !== undefined && !versions)) return undefined
    return { paths, versions }
  }
  const paths = literalList(argument)
  return paths ? { paths, versions: undefined } : undefined
}

/** The routes one file's controllers declare (FR-016, FR-017). */
function routesOf(
  path: string,
  file: ParsedFile,
  settings: Settings
): Array<Route> {
  const imports = importedNames(file.program)
  const fromCommon = (expression: Node) => {
    const imported = calleeOf(expression, imports)
    return imported?.source === COMMON ? imported.imported : undefined
  }
  const routes: Array<Route> = []

  for (const cls of classesOf(file.program)) {
    const controllerDecorator = cls.decorators?.find(
      (d) => fromCommon(d.expression) === "Controller"
    )
    if (!controllerDecorator) continue
    const controller = controllerOf(controllerDecorator.expression)
    if (!controller) continue

    const members = (cls.body as Node).body as Array<Node & Decorated>
    for (const member of members) {
      if (member.type !== "MethodDefinition") continue
      let binding:
        { method: HttpMethod; paths: Array<string>; line: number } | undefined
      let methodVersions: Array<Version> | undefined
      let exact = true
      for (const decorator of member.decorators ?? []) {
        const name = fromCommon(decorator.expression)
        if (name === undefined) continue
        const method = METHOD_DECORATORS[name]
        if (method) {
          const [argument] = argumentsOf(decorator.expression)
          const paths = argument === undefined ? [""] : literalList(argument)
          if (paths)
            binding = { method, paths, line: file.lineOf(decorator.start) }
          else exact = false
        } else if (name === "Version") {
          methodVersions = versionsOf(argumentsOf(decorator.expression)[0])
          if (!methodVersions) exact = false
        }
      }
      if (!binding || !exact) continue

      const versions: Array<Version | undefined> = settings.versioning
        ? (methodVersions ??
          controller.versions ??
          settings.versioning.defaults ?? [undefined])
        : [undefined]
      for (const controllerPath of controller.paths) {
        for (const methodPath of binding.paths) {
          const local = join(controllerPath, methodPath)
          const excluded = settings.exclude.some(
            (e) =>
              join(e.path) === local &&
              (e.method === undefined || e.method === binding.method)
          )
          for (const version of versions) {
            const segment =
              version === undefined || version === NEUTRAL
                ? ""
                : `${settings.versioning?.prefix ?? ""}${version}`
            routes.push({
              method: binding.method,
              path: join(excluded ? "" : settings.prefix, segment, local),
              file: path,
              line: binding.line,
            })
          }
        }
      }
    }
  }
  return routes
}

/** A file that creates the application with `NestFactory` (FR-014). */
function createsApplication(file: ParsedFile): boolean {
  return factoryCalls(file).length > 0
}

/** The calls that create the application: `NestFactory.create(...)` and kin. */
function factoryCalls(file: ParsedFile): Array<Node> {
  const imports = importedNames(file.program)
  return ["create", "createMicroservice", "createApplicationContext"].flatMap(
    (name) =>
      memberCalls(file.program, name).filter((call) => {
        const object = (call.callee as Node).object as Node & { name?: string }
        const imported =
          object.type === "Identifier" && object.name !== undefined
            ? imports.get(object.name)
            : undefined
        return (
          imported?.source === "@nestjs/core" &&
          imported.imported === "NestFactory"
        )
      })
  )
}

/** The variables holding the application: `const app = await NestFactory.create(...)`. */
function applicationNames(file: ParsedFile): Set<string> {
  const starts = new Set(factoryCalls(file).map((call) => call.start))
  const names = new Set<string>()
  new Visitor({
    VariableDeclarator(node) {
      let init = node.init as Node | null
      if (init?.type === "AwaitExpression") init = init.argument as Node
      if (node.id.type === "Identifier" && init && starts.has(init.start)) {
        names.add(node.id.name)
      }
    },
  }).visit(file.program)
  return names
}

export const nestjsAdapter: Adapter = {
  taxonomy,
  recognises: (declared) => declared.has("@nestjs/core"),
  describe(pkg) {
    const roles = new Map<string, string>()
    const entryPoints = new Set<string>()
    const routes: Array<Route> = []
    const settings = settingsOf(pkg)

    for (const path of pkg.files) {
      const stem = stemOf(path)
      const suffix = stem.includes(".")
        ? stem.slice(stem.lastIndexOf(".") + 1)
        : ""
      const file = pkg.syntax(path)
      const role =
        SUFFIX_ROLES[suffix] ?? (file ? decoratorRole(file) : undefined)
      if (role) roles.set(path, role)
      if (!file) continue
      if (createsApplication(file)) entryPoints.add(path)
      if (settings && !isTestFile(localPath(pkg, path))) {
        routes.push(...routesOf(path, file, settings))
      }
    }
    return { roles, entryPoints, routes }
  },
}
