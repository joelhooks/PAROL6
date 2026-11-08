import { expect, it } from "@effect/vitest";
import { Schema } from "effect";
import * as Arbitrary from "effect/Arbitrary";

import { canonicalMarkdownLinks } from "../src/markdown-links.js";

const filename = Arbitrary.array(
  Arbitrary.schema(Schema.Literals(["a", "b", "-", "0"])),
  { maxLength: 12, minLength: 1 }
).pipe(Arbitrary.map((characters) => `${characters.join("")}.svx`));

it.prop(
  "resource links retain their destination when bundled at the root",
  {
    file: filename,
    suffix: Schema.Literals(["", "#section", "?view=agent#section"]),
  },
  ({ file, suffix }) => {
    const target = `./${file}${suffix}`;
    const canonical = `/resources/${file}${suffix}`;

    const input = `[page](${target})\n[angle](<${target}>)\n[ref]: ${target}\n`;

    const result = canonicalMarkdownLinks(
      input,
      "/resources/study.svx",
      "https://parol6.build"
    );

    expect(result).toBe(
      `[page](${canonical})\n[angle](<${canonical}>)\n[ref]: ${canonical}\n`
    );
  }
);

it.prop(
  "bundling leaves code examples and already absolute destinations alone",
  {
    file: filename,
    origin: Schema.Literals([
      "https://parol6.build",
      "https://example.test",
      "//parol6.build",
      "//example.test",
    ]),
  },
  ({ file, origin }) => {
    const target = `${origin}/${file}`;
    const input = `\`[page](./${file})\`\n\`\`\`md\n[page](./${file})\n\`\`\`\n[absolute](${target})\n[angle](<${target}>)\n[ref]: ${target}`;

    expect(
      canonicalMarkdownLinks(
        input,
        "/resources/study.svx",
        "https://parol6.build"
      )
    ).toBe(input);
  }
);
