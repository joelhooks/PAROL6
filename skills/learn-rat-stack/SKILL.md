---
name: learn-rat-stack
updated: "2026-10-06"
description: Trace a capability through Effect, XState, five projections, the CLI, and Alchemy. Try hosted search and read.
plain: "Trace one action from its contract through a handler, a service, a machine, five surfaces, the CLI and the cloud."
diagram: |-
  contract
    │ handler
    │ service + machine
    ▼
  one capability
  ├ CLI
  ├ HTTP
  ├ MCP
  ├ code mode
  └ RPC
---

# Learn the stack

Start with `inspectFile`, a [capability](https://github.com/joelhooks/rat-stack/blob/main/.brain/areas/capabilities.svx): one named action with a contract and a server-side handler. The [contract](https://github.com/joelhooks/rat-stack/blob/main/.brain/areas/capabilities.svx) defines its name, input, output, failure, and metadata. The handler implements the action.

A service is a named interface for one job. A machine defines states and the events that permit movement between them. A [projection](https://github.com/joelhooks/rat-stack/blob/main/.brain/resources/lore/one-capability-every-surface.svx) builds a callable interface from capabilities.

Follow these parts, then try the hosted content tools.

Read [Effect basics](https://github.com/joelhooks/rat-stack/blob/main/.brain/resources/lore/effect-basics.svx) before this trace if the computation model is new. For implementation tasks, use [services](https://github.com/joelhooks/rat-stack/blob/main/.brain/resources/lore/services-capture-dependencies.svx), [Layer composition](https://github.com/joelhooks/rat-stack/blob/main/.brain/resources/lore/layers-make-dependencies-explicit.svx), and [testing](https://github.com/joelhooks/rat-stack/blob/main/.brain/resources/lore/tests-that-earn-their-place.svx).

## The pieces

- Effect describes work with typed failures and required dependencies.
- Schema defines accepted values and their runtime checks.
- A Layer builds services and supplies their construction dependencies.
- XState owns finite lifecycles. The Effect bridge runs their declared actors.
- TypeScript 7 and Effect diagnostics check types and Effect usage.
- Oxlint, Oxfmt, Vitest, and lefthook enforce [the fence](https://github.com/joelhooks/rat-stack/blob/main/.brain/resources/lore/the-fence.svx): checks and hooks that reject prohibited code and shortcuts.
- pnpm and Turborepo connect packages and cache checks.
- Alchemy declares the cloud. Follow [learn Alchemy](/skills/learn-alchemy) for the deployment graph.

## One action, five interfaces

```text
                     ┌─ CLI
                     ├─ HTTP
One Capability ──────┼─ MCP
                     ├─ code mode
                     └─ RPC
```

A [projection](https://github.com/joelhooks/rat-stack/blob/main/.brain/resources/lore/one-capability-every-surface.svx) exposes the same action through another interface. RPC serves browser clients. [Code mode](https://github.com/joelhooks/rat-stack/blob/main/.brain/resources/lore/one-program-can-replace-several-tool-calls.svx) lets agents compose calls in one program.

All five interfaces use one handler.

## Trace one action

The CLI uses `inspectFile`. The hosted site uses a separate content registry.

### 1. Define the contract

The [contract](https://github.com/joelhooks/rat-stack/blob/main/.brain/areas/capabilities.svx) names the action and its input, output, and failure schemas.

```ts repo=rat-stack path=packages/core/src/contracts.ts at=b4d6b8f499e57bc76914ad70df3a0c99751ae28c lines=255-263 {255,258-263}

```

`FileStatsError` belongs to the interface. The annotations mark a repeatable, read-only action.

### 2. Bind one handler

`implement` binds the contract to `runInspectMachine`. The registry includes the resulting [capability](https://github.com/joelhooks/rat-stack/blob/main/.brain/areas/capabilities.svx).

```ts repo=rat-stack path=packages/core/src/inspect-file.ts at=b4d6b8f499e57bc76914ad70df3a0c99751ae28c lines=10-22 {10-12,14-15}

```

The handler starts a machine to read the file.

### 3. Put file work in a service

`FileInspector.make` captures the file system. Its `inspect` method reads bytes and maps file errors to `FileStatsError`.

```ts repo=rat-stack path=packages/core/src/file-inspector.ts at=b4d6b8f499e57bc76914ad70df3a0c99751ae28c lines=14-29 {15,20-24,28}

```

The service exposes its [Layer](https://github.com/joelhooks/rat-stack/blob/main/.brain/resources/lore/layer-constructor-pattern.svx) beside the implementation. This follows [hexagonal architecture](https://github.com/joelhooks/rat-stack/blob/main/.brain/resources/lore/hexagonal-architecture.svx): composition supplies the file-system dependency.

```ts repo=rat-stack path=packages/core/src/file-inspector.ts at=b4d6b8f499e57bc76914ad70df3a0c99751ae28c lines=31-35 {34}

```

Callers ask the service to inspect a path. Composition chooses the file-system implementation.

### 4. Give the lifecycle named states

A declared `createEffectLogic` actor calls `FileInspector`.

```ts repo=rat-stack path=packages/core/src/inspect-machine.ts at=b4d6b8f499e57bc76914ad70df3a0c99751ae28c lines=26-30 {26,28}

```

The machine starts in `reading`. It finishes in `inspected` or `unreadable`.

```ts repo=rat-stack path=packages/core/src/inspect-machine.ts at=b4d6b8f499e57bc76914ad70df3a0c99751ae28c lines=40-64 {40,43,51,57,59,62}

```

### 5. Project the registered actions

The command-line interface (CLI) projects capability lists for each server interface. HTTP uses stateless learning capabilities. MCP and code mode use their local learning counterparts. All three include `inspectFile`.

```ts repo=rat-stack path=apps/cli/src/surfaces.ts at=b4d6b8f499e57bc76914ad70df3a0c99751ae28c lines=25-33,40-51 {25-28,30-33,40,42,44,48}

```

The RPC [projection](https://github.com/joelhooks/rat-stack/blob/main/.brain/resources/lore/one-capability-every-surface.svx) derives contracts from its supplied capabilities.

```ts repo=rat-stack path=packages/capability/src/to-rpc.ts at=b4d6b8f499e57bc76914ad70df3a0c99751ae28c lines=24-27 {24,27}

```

A projection takes a registry and reuses its domain handlers.

### 6. Connect the CLI

`toCommand` derives each command. `inspectFile` also gets the `stats` alias.

```ts repo=rat-stack path=apps/cli/src/command.ts at=b4d6b8f499e57bc76914ad70df3a0c99751ae28c lines=22-35 {25-28}

```

The entry point supplies the service [Layer](https://github.com/joelhooks/rat-stack/blob/main/.brain/resources/lore/layer-constructor-pattern.svx) and Node services. It denies [approval](https://github.com/joelhooks/rat-stack/blob/main/.brain/areas/capabilities.svx) by default.

```ts repo=rat-stack path=apps/cli/src/cli.ts at=b4d6b8f499e57bc76914ad70df3a0c99751ae28c lines=22-32 {24,30}

```

The command keeps the shared handler.

### 7. Compose the cloud

An Alchemy Stack groups one cloud infrastructure program and its outputs. Alchemy declares the Stack, Cloudflare providers, and state. The Stack includes `Mischief` and `Website`.

```ts repo=rat-stack path=apps/infra/alchemy.run.ts at=b4d6b8f499e57bc76914ad70df3a0c99751ae28c lines=16-22,118-129 {16,19-20,118,120}

```

The Stack deploys the cloud applications. The Node file-inspection CLI runs separately.

## Try hosted search and read

Use [POST /api/execute](/llms.txt#run-code-one-program-instead-of-several-calls) for [code mode](https://github.com/joelhooks/rat-stack/blob/main/.brain/resources/lore/one-program-can-replace-several-tool-calls.svx). The [agent guide](/llms.txt) documents this search → read program:

```js
const found = await tools.search({ query: "cartridges", limit: 1 });
const page = await tools.read({ id: found.matches[0].id });
return { title: page.title, id: page.id };
```

Send it as a JSON `code` string:

```sh
curl --request POST 'https://ratstack.sh/api/execute' \
  --header 'content-type: application/json' \
  --data '{"code":"const found = await tools.search({ query: \"cartridges\", limit: 1 }); const page = await tools.read({ id: found.matches[0].id }); return { title: page.title, id: page.id };"}'
```

`read` takes the exact ID from `search`. This hosted program reads site content.

## Read before changing a piece

1. Read [`AGENTS.md`](/AGENTS.md) for pins, boundaries, and [the fence](https://github.com/joelhooks/rat-stack/blob/main/.brain/resources/lore/the-fence.svx).
2. Read [VISION.md](/VISION.md) for intent.
3. Read the package you plan to change.
4. Before Effect or XState work, read `node_modules/effect/AGENTS.md` and the pinned sources listed in repo law.

In a copied product repo, replace the template's product notes and rules. Keep the stack lessons that still serve the product.

Follow repo law and pinned code when an example is stale.

## Pick the next skill

- Add schemas and a shared action: [`add-a-capability`](/skills/add-a-capability).
- Model a lifecycle: [add a lifecycle machine](/skills/add-a-lifecycle-machine).
- Remove an interface: [keep or cut](/skills/keep-or-cut).
- Follow the cloud footprint: [learn Alchemy](/skills/learn-alchemy).

## Finish

Run the full gate:

```sh
pnpm turbo run check test build
```

Fix failures. Keep [the fence](https://github.com/joelhooks/rat-stack/blob/main/.brain/resources/lore/the-fence.svx) intact.

Check deployment separately from the gate.
