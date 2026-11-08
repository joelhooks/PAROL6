// @effect-diagnostics nodeBuiltinImport:off -- The root workspace has no Effect platform package; this guard only lists tracked files with git and reads them.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  privateMatchMessage,
  scannable,
  scanText,
} from "./public-safety-scan.ts";

const root = process.cwd();

const listing = spawnSync("git", ["ls-files", "-z"], {
  cwd: root,
  encoding: "utf-8",
});

if (listing.status !== 0) {
  process.stderr.write(
    `public-safety: git ls-files failed in ${root}. The guard scans tracked files only. Fix: run \`pnpm public-safety\` from a Git checkout.\n${listing.stderr}`
  );
  process.exit(1);
}

const matches = listing.stdout
  .split("\0")
  .filter(scannable)
  .flatMap((entry) => {
    try {
      return scanText(entry, readFileSync(path.join(root, entry), "utf-8"));
    } catch {
      return [];
    }
  });

for (const found of matches) {
  process.stderr.write(`${privateMatchMessage(found)}\n`);
}

if (matches.length > 0) {
  process.stderr.write(
    `public-safety: ${matches.length} private pattern match(es) in tracked files.\n`
  );
  process.exit(1);
}

process.stdout.write("public-safety: no private patterns in tracked files\n");
