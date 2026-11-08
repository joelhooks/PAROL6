import { exemptPaths, privatePatterns } from "./public-safety-patterns.ts";
import type { PrivatePattern } from "./public-safety-patterns.ts";

export interface PrivateMatch {
  readonly label: string;
  readonly line: number;
  readonly match: string;
  readonly path: string;
}

const binaryExtensions =
  /\.(?:avif|gif|ico|jpe?g|pdf|png|webp|woff2?|ttf|otf|mp3|mp4|mov|zip|gz|tgz|wasm)$/iu;

export const scannable = (path: string) =>
  path !== "" && !binaryExtensions.test(path) && !exemptPaths.includes(path);

const allowed = (pattern: PrivatePattern, path: string, match: string) =>
  (pattern.allowedPaths ?? []).includes(path) ||
  (pattern.allowedMatches?.test(match) ?? false);

export const scanText = (
  path: string,
  text: string,
  patterns: readonly PrivatePattern[] = privatePatterns
): readonly PrivateMatch[] =>
  text.includes("\0")
    ? []
    : text
        .split("\n")
        .flatMap((lineText, index) =>
          patterns.flatMap((pattern) =>
            [...lineText.matchAll(pattern.pattern)].flatMap(([match]) =>
              allowed(pattern, path, match)
                ? []
                : [{ label: pattern.label, line: index + 1, match, path }]
            )
          )
        );

export const privateMatchMessage = (found: PrivateMatch) =>
  `${found.path}:${found.line} contains ${found.label} (${found.match}). This repository is public, so tracked files must not carry private details. Fix: remove it from \`${found.path}\`, or, if it is public on purpose, add an allowance in \`scripts/public-safety-patterns.ts\`.`;
