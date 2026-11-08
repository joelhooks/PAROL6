import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { Effect, FileSystem, Path, Schema } from "effect";
import * as Arbitrary from "effect/Arbitrary";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { privatePatterns } from "../../../scripts/public-safety-patterns.js";

const flagged = (path: string, text: string) =>
  privatePatterns.some((pattern) =>
    [...text.matchAll(pattern.pattern)].some(
      (found) =>
        !(pattern.allowedPaths ?? []).includes(path) &&
        !(pattern.allowedMatches?.test(found[0]) ?? false)
    )
  );

const word = Arbitrary.schema(
  Schema.String.check(Schema.isPattern(/^[a-z]{3,12}$/u))
);

it.prop(
  "flags a real email address wherever it sits in a page",
  { after: word, before: word, domain: word, local: word },
  ({ before, domain, local, after }) => {
    expect(
      flagged("notes.md", `${before} ${local}@${domain}.dev ${after}`)
    ).toBe(true);
  }
);

it.prop(
  "lets reserved example domains through",
  { domain: word, local: word },
  ({ domain, local }) => {
    expect(flagged("notes.md", `${local}@${domain}.example.com`)).toBe(false);
    expect(flagged("notes.md", `${local}@${domain}.test`)).toBe(false);
  }
);

it.layer(NodeServices.layer)("public-safety guard", (test) => {
  test.effect(
    "fails on a tracked file with an email address and passes once it is removed",
    () =>
      Effect.gen(function* guardsTrackedFiles() {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
        const root = path.resolve(import.meta.dirname, "../../..");
        const guard = path.join(root, "scripts/public-safety.ts");
        const directory = yield* fileSystem.makeTempDirectoryScoped();
        const fixture = path.join(directory, "milestone.md");

        const run = (command: string, args: readonly string[]) =>
          spawner.exitCode(
            ChildProcess.make(command, args, { cwd: directory })
          );

        expect(yield* run("git", ["init", "-q"])).toBe(0);

        yield* fileSystem.writeFileString(
          fixture,
          `Ask the builder at ${["builder", "parol6-fixture.dev"].join("@")} before M1.\n`
        );

        expect(yield* run("git", ["add", "milestone.md"])).toBe(0);
        expect(yield* run("node", [guard])).toBe(1);

        yield* fileSystem.writeFileString(
          fixture,
          "Ask in the build thread before M1.\n"
        );

        expect(yield* run("node", [guard])).toBe(0);
      })
  );
});
