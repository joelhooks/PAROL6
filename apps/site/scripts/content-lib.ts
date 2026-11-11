import { Schema } from "effect";

import { bibliographySourceSchema } from "./component-data.ts";
import type { BibliographySource, CopyPromptSpec } from "./component-data.ts";
import {
  componentContext,
  createComponentRegistry,
  renderComponent,
  renderSvxMarkdown,
} from "./component-registry.ts";
import type { ComponentInput } from "./component-registry.ts";
import { buildError, ContentBuildError, violation } from "./content-error.ts";
import {
  contentHeadings,
  contentLinkHrefs,
  contentRoot,
  countHtmlElements,
  frontmatterData,
  htmlTokens,
  parseContentMarkdown,
  scanLeadingFrontmatterFence,
  stringifyContentMarkdown,
  visitContentNodes,
} from "./svx-ast.ts";

const tierLetters = new Set(["S", "A", "B", "C", "D", "E", "F"]);

const pairedTableHeaders = new Set(["Seen / checked", "XState · bridge"]);

const tierOfCell = (header: string, text: string) =>
  header === "Tier" && tierLetters.has(text) ? text : undefined;

export {
  buildError,
  ContentBuildError,
  ContentRuleViolation,
  violation,
} from "./content-error.ts";

export interface ResponsiveTableNode {
  readonly type: string;
  readonly tagName?: string;
  readonly value?: string;
  properties?: Record<
    string,
    boolean | number | string | null | undefined | readonly (string | number)[]
  >;
  children?: ResponsiveTableNode[];
}

const responsiveTableText = (node: ResponsiveTableNode): string =>
  node.value ?? (node.children ?? []).map(responsiveTableText).join("");

const tableChildren = (node: ResponsiveTableNode, tagName: string) =>
  (node.children ?? []).filter((child) => child.tagName === tagName);

const childrenOfTable = (node: ResponsiveTableNode) =>
  (node.children ?? []).filter((child) =>
    ["thead", "tbody", "tfoot"].includes(child.tagName ?? "")
  );

const tableToken = (value: string): ResponsiveTableNode => ({
  children: [{ type: "text", value }],
  properties: { className: ["table-token"] },
  tagName: "span",
  type: "element",
});

const formatTableHeader = (cell: ResponsiveTableNode) => {
  cell.properties = { ...cell.properties, role: "columnheader", scope: "col" };

  if (pairedTableHeaders.has(responsiveTableText(cell).trim())) {
    cell.properties.className = ["table-pair-header"];
  }
};

const formatTableCellTokens = (
  cell: ResponsiveTableNode,
  header: string,
  text: string
) => {
  const pair = pairedTableHeaders.has(header) ? text.split(" · ") : [];

  if (pair.length === 2) {
    cell.properties = { ...cell.properties, className: ["table-pair"] };
    cell.children = pair.map(tableToken);
  } else if (
    header !== "Studied" &&
    /^(?:[@\w./-]+)(?:\s[=≠])?[⁰¹²³⁴⁵⁶⁷⁸⁹]*$/u.test(text)
  ) {
    cell.properties = { ...cell.properties, className: ["table-token"] };
  }

  if (header === "Repo") {
    for (const link of tableChildren(cell, "a")) {
      const [owner, repo, ...rest] = responsiveTableText(link).split("/");

      if (
        owner !== undefined &&
        owner !== "" &&
        repo !== undefined &&
        repo !== "" &&
        rest.length === 0
      ) {
        link.children = [
          tableToken(`${owner}/`),
          { children: [], properties: {}, tagName: "wbr", type: "element" },
          tableToken(repo),
        ];
      }
    }
  }
};

export const responsiveTables = () => {
  let heading = "";

  const visit = (node: ResponsiveTableNode): void => {
    if (node.tagName !== undefined && /^h[1-6]$/u.test(node.tagName)) {
      heading = responsiveTableText(node).trim();
    }

    const children = node.children ?? [];

    for (const [index, child] of children.entries()) {
      if (child.tagName !== "table") {
        visit(child);
        continue;
      }

      const headers = tableChildren(child, "thead")
        .flatMap((section) => tableChildren(section, "tr"))
        .flatMap((row) => tableChildren(row, "th"))
        .map(responsiveTableText);

      const caption = tableChildren(child, "caption")
        .map(responsiveTableText)
        .join("")
        .trim();

      const label = caption || heading || headers.join(" / ") || "Data";
      child.properties = { ...child.properties, role: "table" };

      for (const section of childrenOfTable(child)) {
        section.properties = { ...section.properties, role: "rowgroup" };

        for (const row of tableChildren(section, "tr")) {
          row.properties = { ...row.properties, role: "row" };

          for (const cell of tableChildren(row, "th")) {
            formatTableHeader(cell);
          }

          for (const [column, cell] of tableChildren(row, "td").entries()) {
            const header = headers[column]?.trim() ?? "";
            const text = responsiveTableText(cell).trim();
            const tier = tierOfCell(header, text);

            cell.properties = {
              ...cell.properties,
              dataLabel: header === "" ? `Column ${column + 1}` : header,
              role: "cell",
            };

            formatTableCellTokens(cell, header, text);

            if (tier !== undefined) {
              cell.properties.dataTier = tier;
            }
          }
        }
      }

      children[index] = {
        children: [child],
        properties: {
          ariaLabel: `${label} table`,
          className:
            headers.length >= 6
              ? ["table-wrapper", "table-wide"]
              : ["table-wrapper"],
          role: "region",
          tabIndex: 0,
        },
        tagName: "div",
        type: "element",
      };
    }
  };

  return visit;
};

export type LoreGroup = "idea" | "concept" | "source" | "person" | "system";

export const SYSTEMS_DIRECTORY = ".brain/areas";

export const sectionOf = (group: LoreGroup) =>
  group === "system"
    ? ({ href: "/systems", kind: "System", label: "systems" } as const)
    : ({ href: "/lore", kind: "Lore", label: "lore" } as const);

export const SYSTEM_SECTIONS = [
  "What it does",
  "The standard",
  "How to check",
] as const;

export interface LoreTermTarget {
  readonly routePath: string;
  readonly term: string;
}

export type { BibliographySource } from "./component-data.ts";

export interface LorePageMetadata {
  readonly bibliography: readonly BibliographySource[];
  readonly card?: string;
  readonly prerequisites: readonly string[];
  readonly date?: string;
  readonly description: string;
  readonly diagram?: string;
  readonly learn?: boolean;
  readonly plain?: string;
  readonly group: LoreGroup;
  readonly routePath: `/lore/${string}` | `/systems/${string}`;
  readonly slug: string;
  readonly sourcePath: string;
  readonly sources: readonly string[];
  readonly speaker?: string;
  readonly terms: readonly string[];
  readonly title: string;
  readonly url?: string;
}

export const loreFrontmatterSchema = Schema.Struct({
  card: Schema.optional(Schema.String),
  date: Schema.optional(Schema.String),
  description: Schema.String,
  diagram: Schema.optional(Schema.String),
  group: Schema.Literals(["idea", "concept", "source", "person", "system"]),
  learn: Schema.optional(Schema.Boolean),
  plain: Schema.optional(Schema.String),
  prerequisites: Schema.optional(Schema.Array(Schema.String)),
  sources: Schema.Array(
    Schema.Union([Schema.String, bibliographySourceSchema])
  ),
  speaker: Schema.optional(Schema.String),
  terms: Schema.optional(Schema.Array(Schema.String)),
  title: Schema.String,
  url: Schema.optional(Schema.String),
});

export const frontmatterTerms = (rawText: string, sourcePath: string) =>
  Schema.decodeUnknownSync(Schema.Array(Schema.String))(
    frontmatterData(rawText, sourcePath).terms ?? []
  );

export const frontmatterValue = (rawText: string, field: string) =>
  Schema.decodeUnknownSync(Schema.String)(frontmatterData(rawText)[field]);

type LoreFrontmatter = typeof loreFrontmatterSchema.Type;

type MutableLorePageMetadata = {
  -readonly [Key in keyof LorePageMetadata]: LorePageMetadata[Key];
};

const decodeLoreFrontmatter = (
  sourcePath: string,
  rawText: string
): LoreFrontmatter => {
  try {
    const data = frontmatterData(rawText, sourcePath);

    const sources = Schema.decodeUnknownSync(
      Schema.Array(Schema.Union([Schema.String, bibliographySourceSchema])),
      { onExcessProperty: "error" }
    )(data.sources);

    return Schema.decodeUnknownSync(loreFrontmatterSchema)({
      ...data,
      sources,
    });
  } catch (error) {
    if (Schema.is(ContentBuildError)(error)) {
      throw error;
    }

    throw buildError(
      "frontmatter",
      sourcePath,
      violation(
        "The frontmatter does not match the lore page schema.",
        "Search, cards, and the bibliography read these fields, so the page cannot render.",
        "repair the YAML against `loreFrontmatterSchema` in `apps/site/scripts/content-lib.ts`; a linked source needs `url`, `title`, `publisher`, `note`, and `accessed`, and a recorded source needs `kind: recording`, `title`, `recordedAt` (YYYY-MM-DD), and `note`, with no `url`.",
        error
      )
    );
  }
};

const validateLoreDescription = (
  sourcePath: string,
  decoded: LoreFrontmatter
) => {
  if (decoded.title.trim() === "" || decoded.description.trim() === "") {
    throw buildError(
      "frontmatter",
      sourcePath,
      violation(
        "title and description must not be empty.",
        "Search results, page cards, and llms.txt show both.",
        "fill in `title:` and `description:` in the frontmatter."
      )
    );
  }

  if (decoded.description.match(/[.!?](?=\s|$)/gu)?.length !== 1) {
    throw buildError(
      "frontmatter",
      sourcePath,
      violation(
        "description must be one sentence ending in punctuation.",
        "The description is the page's card and meta description, which read as one claim.",
        "rewrite `description:` as one sentence ending in `.`, `!`, or `?`, and move the rest into the page body."
      )
    );
  }
};

const validateSystemPlacement = (
  sourcePath: string,
  decoded: LoreFrontmatter,
  rawText: string
) => {
  const inSystems = sourcePath.startsWith(`${SYSTEMS_DIRECTORY}/`);

  if (inSystems !== (decoded.group === "system")) {
    throw buildError(
      "frontmatter",
      sourcePath,
      violation(
        `system pages live in ${SYSTEMS_DIRECTORY} with group: system, and nothing else does.`,
        "The site publishes /systems/ pages from that directory and that group together.",
        `move the file into \`${SYSTEMS_DIRECTORY}/\` and set \`group: system\`, or move it out and choose another \`group:\`.`
      )
    );
  }

  if (!inSystems) {
    return;
  }

  const headings = new Set(contentHeadings(rawText, 2));

  const missing = SYSTEM_SECTIONS.filter((section) => !headings.has(section));

  if (missing.length > 0) {
    throw buildError(
      "frontmatter",
      sourcePath,
      violation(
        `system pages need sections: ${missing.join(", ")}.`,
        "Every system page says what it does, the standard it keeps, and how to check it.",
        `add the missing H2 headings: ${missing.map((section) => `\`## ${section}\``).join(", ")}.`
      )
    );
  }
};

const validateLoreGroup = (sourcePath: string, decoded: LoreFrontmatter) => {
  if (decoded.group !== "source") {
    return;
  }

  if (
    decoded.speaker?.trim() === undefined ||
    decoded.speaker.trim() === "" ||
    decoded.date === undefined ||
    !/^\d{4}-\d{2}-\d{2}$/u.test(decoded.date) ||
    decoded.url === undefined
  ) {
    throw buildError(
      "frontmatter",
      sourcePath,
      violation(
        "source pages require speaker, date, and recording url.",
        "A source page cites a recording, and readers need to find it.",
        "set `speaker:`, `date:` as YYYY-MM-DD, and `url:` to the recording in the frontmatter."
      )
    );
  }
};

const validateLoreTerms = (sourcePath: string, decoded: LoreFrontmatter) => {
  const terms = decoded.terms ?? [];

  if (decoded.group !== "source" && terms.length === 0) {
    throw buildError(
      "frontmatter",
      sourcePath,
      violation(
        `${decoded.group} pages must declare terms.`,
        "Terms feed the glossary, first-use links, and search.",
        "add `terms:` with at least one term the page teaches."
      )
    );
  }

  if (terms.some((term) => term.trim() === "")) {
    throw buildError(
      "frontmatter",
      sourcePath,
      violation(
        "terms must not contain an empty value.",
        "An empty term links nothing and breaks the term index.",
        "delete the empty entry from `terms:`."
      )
    );
  }

  return terms;
};

const validateLoreSources = (sourcePath: string, decoded: LoreFrontmatter) => {
  for (const source of [
    ...decoded.sources.flatMap((entry) => {
      if (Schema.is(Schema.String)(entry)) {
        return [entry];
      }

      return entry.kind === "recording" ? [] : [entry.url];
    }),
    ...(decoded.url === undefined ? [] : [decoded.url]),
  ]) {
    let parsed: URL;

    try {
      parsed = new URL(source);
    } catch (error) {
      throw buildError("frontmatter", sourcePath, error);
    }

    if (parsed.protocol !== "https:") {
      throw buildError(
        "frontmatter",
        sourcePath,
        violation(
          `source must be a public HTTPS URL: ${source}.`,
          "Readers follow these links, and a private or plain-HTTP link fails them.",
          "replace it with the public `https://` URL, or cite it as `kind: recording`."
        )
      );
    }
  }
};

export const parseLorePage = (
  sourcePath: string,
  rawText: string
): LorePageMetadata => {
  const filename = sourcePath.split("/").at(-1) ?? "";
  const slug = filename.endsWith(".svx") ? filename.slice(0, -4) : "";

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) {
    throw buildError(
      "frontmatter",
      sourcePath,
      violation(
        "lore filename must be a lowercase kebab-case .svx slug.",
        "The filename becomes the page's URL.",
        "rename the file, for example `My Page.svx` to `my-page.svx`."
      )
    );
  }

  if (scanLeadingFrontmatterFence(rawText, sourcePath).yaml === undefined) {
    throw buildError(
      "frontmatter",
      sourcePath,
      violation(
        "missing YAML frontmatter.",
        "Every page declares its title, description, group, and terms there.",
        "start the file with a `---` fenced YAML block that declares `title:`, `description:`, `group:`, and `terms:`."
      )
    );
  }

  const decoded = decodeLoreFrontmatter(sourcePath, rawText);
  validateLoreDescription(sourcePath, decoded);

  const terms = validateLoreTerms(sourcePath, decoded);

  validateLoreGroup(sourcePath, decoded);
  validateSystemPlacement(sourcePath, decoded, rawText);
  validateLoreSources(sourcePath, decoded);

  const bibliography = decoded.sources.map((source) => {
    if (!Schema.is(Schema.String)(source) && source.kind === "recording") {
      if (
        [source.title, source.note].some(
          (value) => value.trim() === "" || /[\r\n]/u.test(value)
        ) ||
        /https?:\/\//u.test(source.title)
      ) {
        throw buildError(
          "bibliography",
          sourcePath,
          violation(
            "recording sources require a plain title, note, and ISO recordedAt date.",
            "The bibliography renders a recording as plain text, without a link.",
            "give the source a one-line `title:` and `note:` with no URL, and `recordedAt:` as YYYY-MM-DD."
          )
        );
      }

      return source;
    }

    if (
      Schema.is(Schema.String)(source) ||
      [source.title, source.note, source.publisher].some(
        (value) => value.trim() === "" || /[\r\n]/u.test(value)
      ) ||
      !/^\d{4}-\d{2}-\d{2}$/u.test(source.accessed) ||
      /https?:\/\//u.test(source.title)
    ) {
      throw buildError(
        "bibliography",
        sourcePath,
        violation(
          "every source requires title, publisher, note, and accessed date.",
          "The bibliography tells readers who published each source and when it was read.",
          "replace a bare URL string with `{ url, title, publisher, note, accessed: YYYY-MM-DD }`, each value on one line."
        )
      );
    }

    return source;
  });

  const metadata: MutableLorePageMetadata = {
    bibliography,
    card: decoded.card ?? decoded.description,
    description: decoded.description,
    group: decoded.group,
    prerequisites: decoded.prerequisites ?? [],
    routePath:
      decoded.group === "system" ? `/systems/${slug}` : `/lore/${slug}`,
    slug,
    sourcePath,
    sources: bibliography.flatMap((source) =>
      source.kind === "linked" ? [source.url] : []
    ),
    terms,
    title: decoded.title,
  };

  if (decoded.date !== undefined) {
    metadata.date = decoded.date;
  }

  if (decoded.speaker !== undefined) {
    metadata.speaker = decoded.speaker;
  }

  if (decoded.plain !== undefined) {
    metadata.plain = decoded.plain;
  }

  if (decoded.diagram !== undefined) {
    metadata.diagram = decoded.diagram;
  }

  if (decoded.learn !== undefined) {
    metadata.learn = decoded.learn;
  }

  if (decoded.url !== undefined) {
    metadata.url = decoded.url;
  }

  return metadata;
};

export const assertLoreTerms = (
  pages: readonly Pick<LorePageMetadata, "sourcePath" | "terms">[]
): void => {
  const owners = new Map<string, string>();

  for (const page of pages) {
    for (const term of page.terms) {
      const normalized = term.trim().toLowerCase();
      const previousPath = owners.get(normalized);

      if (previousPath !== undefined) {
        throw buildError(
          "lore terms",
          `${page.sourcePath} (previous claimant: ${previousPath})`,
          violation(
            `term "${term}" is claimed by multiple pages.`,
            "Each term links to exactly one teaching page.",
            "keep the term in one page's `terms:` and link to that page from the other."
          )
        );
      }

      owners.set(normalized, page.sourcePath);
    }
  }
};

export interface GlossaryEntry {
  readonly term: string;
  readonly summary: string;
  readonly routePath: string;
}

interface GlossaryPage {
  readonly description: string;
  readonly routePath: string;
}

const glossaryDefinitions: readonly GlossaryEntry[] = [
  {
    routePath: "/lore/m1-bench-it",
    summary:
      "The stepper driver module, in the StepStick format, that the PAROL6 control board takes six of; the firmware configures it over SPI.",
    term: "TMC5160",
  },
  {
    routePath: "/lore/m1-bench-it",
    summary:
      "One of the 32 subdivisions of a full motor step that the drivers run at, so one motor turn is 6,400 microsteps.",
    term: "microstep",
  },
  {
    routePath: "/lore/m1-bench-it",
    summary:
      "Control without position feedback: the motors have no encoders, so the position is the count of steps commanded since homing.",
    term: "open loop",
  },
  {
    routePath: "/lore/m1-bench-it",
    summary:
      "A contact that conducts until it is pressed; the E-stop must be one, so pressing it, unplugging it or cutting its wire all stop the robot.",
    term: "normally closed",
  },
  {
    routePath: "/lore/m1-bench-it",
    summary:
      "The 2-pin circular connector that takes 24 V DC into the robot's base; it has no fixed +24 V pin, so polarity is checked by meter.",
    term: "GX16",
  },
  {
    routePath: "/lore/m1-bench-it",
    summary:
      "The power connector on the control board that the base's GX16 socket is wired to.",
    term: "XT30",
  },
  {
    routePath: "/lore/m1-bench-it",
    summary:
      "The two pins on a driver module that show its orientation; they must point at the red arrows in the official figure.",
    term: "DIAG pins",
  },
  {
    routePath: "/lore/m1-bench-it",
    summary:
      "The bench firmware every board ships with: it checks the six drivers, turns every motor slowly and reports the inputs over USB.",
    term: "test firmware",
  },
  {
    routePath: "/lore/m2-one-joint",
    summary:
      "The STMicroelectronics programmer that uploads firmware to the board, through the PAROL6 programming adapter or the four named header pins only.",
    term: "ST-Link",
  },
  {
    routePath: "/lore/m2-one-joint",
    summary:
      "A compact gearbox on the motor; PAROL6 uses the EG precision series, 20 to 1 on joints 2 and 3 and 10 to 1 on joint 6.",
    term: "planetary gearbox",
  },
  {
    routePath: "/lore/m2-one-joint",
    summary:
      "Motor turns per joint turn; joint 6's 10 to 1 gearbox turns one motor revolution into 36 degrees at the joint.",
    term: "transmission ratio",
  },
  {
    routePath: "/lore/m2-one-joint",
    summary:
      "The play in a drive before the output moves; the EG gearboxes have 15 to 20 arc-minutes of it.",
    term: "backlash",
  },
  {
    routePath: "/lore/m2-one-joint",
    summary:
      "The print material for PAROL6's parts; it softens around 80 °C, where PLA fails near the warm motors.",
    term: "PETG",
  },
  {
    routePath: "/lore/m2-one-joint",
    summary:
      "An adhesive for screw threads; blue goes on every metal-to-metal screw and on all set screws.",
    term: "threadlocker",
  },
  {
    routePath: "/lore/m2-one-joint",
    summary:
      "The contactless sensor that homes joints 1, 4 and 6 by sensing a small steel screw.",
    term: "inductive sensor",
  },
  {
    routePath: "/lore/m2-one-joint",
    summary:
      "A headless screw that clamps a coupler to a motor or gearbox shaft.",
    term: "set screw",
  },
  {
    routePath: "/lore/m3-whole-arm",
    summary:
      "Driving each joint to its switch or sensor, then a known number of steps to the after-homing pose; needed after every power-up, collision, stall or move by hand.",
    term: "homing",
  },
  {
    routePath: "/lore/m3-whole-arm",
    summary:
      "Holes in neighbouring links that line up in the after-homing pose, so a pin pushed through them proves the pose.",
    term: "witness marks",
  },
  {
    routePath: "/lore/m3-whole-arm",
    summary:
      "Correcting each joint's homed position in the firmware until a homed robot stands exactly at its witness marks.",
    term: "mastering",
  },
  {
    routePath: "/lore/m3-whole-arm",
    summary:
      "Moving one joint, or the tool along one axis, for as long as a button is held or a command repeats.",
    term: "jogging",
  },
  {
    routePath: "/lore/m3-whole-arm",
    summary: "The mechanical switch that homes joints 2, 3 and 5.",
    term: "limit switch",
  },
  {
    routePath: "/lore/m4-pick-and-place",
    summary:
      "The tool centre point: the point on the tool that the software positions, set as a transform from the flange.",
    term: "TCP",
  },
  {
    routePath: "/lore/lerobot",
    summary:
      "Hugging Face's open-source Python library for robot learning, licensed Apache-2.0; the planned stage after M3 drives PAROL6 with it.",
    term: "LeRobot",
  },
  {
    routePath: "/lore/lerobot",
    summary:
      "Training a robot to do a task from recorded demonstrations of that task.",
    term: "imitation learning",
  },
  {
    routePath: "/lore/lerobot",
    summary:
      "Driving a robot live from another device, such as a leader arm, a phone or a gamepad.",
    term: "teleoperation",
  },
  {
    routePath: "/lore/lerobot",
    summary:
      "The arm a person moves during teleoperation; the robot, the follower, copies it.",
    term: "leader arm",
  },
  {
    routePath: "/lore/lerobot",
    summary:
      "One recorded demonstration, start to end, with joint angles and camera video, in a LeRobot dataset.",
    term: "episode",
  },
  {
    routePath: "/lore/lerobot",
    summary:
      "A LeRobot policy: a ResNet-18 image backbone and a transformer that predict chunks of actions from cameras and joints.",
    term: "ACT",
  },
  {
    routePath: "/lore/skiff-target",
    summary:
      "Horizontal pitch, the Eurorack panel width unit; 1 HP is 5.08 mm.",
    term: "HP",
  },
];

export const glossaryEntries = (
  pages: readonly GlossaryPage[],
  definitions: readonly GlossaryEntry[] = glossaryDefinitions
): readonly GlossaryEntry[] => {
  const entries = new Map<string, GlossaryEntry>();

  for (const entry of definitions) {
    const key = entry.term.trim().toLowerCase();

    const page = pages.find(
      (candidate) => candidate.routePath === entry.routePath
    );

    if (key === "" || entry.summary.trim() === "") {
      throw buildError(
        "glossary definition",
        entry.term,
        violation(
          "This glossary entry has an empty term or definition.",
          "The glossary shows the term beside its definition.",
          "give the entry a `term` and its own `summary` in `glossaryDefinitions` in `apps/site/scripts/content-lib.ts`."
        )
      );
    }

    if (page === undefined) {
      throw buildError(
        "glossary definition",
        entry.term,
        violation(
          `Missing teaching page: ${entry.routePath}.`,
          "Every glossary term links to the page that teaches it.",
          "point `routePath` in `glossaryDefinitions` at a published page, or write that page."
        )
      );
    }

    if (entry.summary.trim() === page.description.trim()) {
      throw buildError(
        "glossary definition",
        entry.term,
        violation(
          "This glossary definition copies the page summary.",
          "A glossary reader needs the term defined, not the page advertised.",
          "rewrite `summary` in `glossaryDefinitions` as a definition of the term itself."
        )
      );
    }

    if (entries.has(key)) {
      throw buildError(
        "glossary definition",
        entry.term,
        violation(
          "This glossary term is declared more than once.",
          "Each term has one definition.",
          "delete the duplicate entry from `glossaryDefinitions` in `apps/site/scripts/content-lib.ts`."
        )
      );
    }

    entries.set(key, entry);
  }

  return [...entries.values()].toSorted((left, right) =>
    left.term.localeCompare(right.term, "en", { sensitivity: "base" })
  );
};

export const assertGlossaryLinks = (
  entries: readonly GlossaryEntry[],
  pageRoutes: ReadonlySet<string>
): void => {
  for (const entry of entries) {
    if (!pageRoutes.has(entry.routePath)) {
      throw buildError(
        "glossary link",
        entry.term,
        violation(
          `Missing page: ${entry.routePath}.`,
          "The glossary would link readers to a page that does not exist.",
          "point the entry's `routePath` at a published page."
        )
      );
    }
  }
};

export const glossaryAgentMarkdown = (entries: readonly GlossaryEntry[]) =>
  [
    "# Glossary",
    "",
    ...entries.map(
      (entry) => `- ${entry.term} → ${entry.summary} → ${entry.routePath}`
    ),
    "",
  ].join("\n");

export const glossaryMarkdown = (entries: readonly GlossaryEntry[]) => {
  const lines = ["# Glossary", ""];
  let previousLetter = "";

  for (const entry of entries) {
    const letter = entry.term.charAt(0).toUpperCase();

    if (letter !== previousLetter) {
      lines.push(`## ${letter}`, "");
      previousLetter = letter;
    }

    lines.push(`- [${entry.term}](${entry.routePath}) → ${entry.summary}`, "");
  }

  return lines.join("\n");
};

export const loreTermTargets = (
  pages: readonly Pick<LorePageMetadata, "routePath" | "terms">[]
): readonly LoreTermTarget[] =>
  pages.flatMap((page) =>
    page.terms.map((term) => ({ routePath: page.routePath, term }))
  );

const escapedRegex = (value: string) =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const loreTermPattern = (targets: readonly LoreTermTarget[]) => {
  const terms = targets
    .map((target) => target.term)
    .toSorted((left, right) => right.length - left.length);

  return new RegExp(
    `(?<![\\p{L}\\p{N}_])(?<term>${terms.map(escapedRegex).join("|")})(?![\\p{L}\\p{N}_])`,
    "giu"
  );
};

export interface LoreHastNode {
  readonly type: string;
  readonly tagName?: string;
  readonly value?: string;
  children?: LoreHastNode[];
  properties?: { readonly href?: string };
}

export const isPlainEffect = (term: string, precedingText: string) =>
  term.toLowerCase() === "effect" &&
  (term !== "Effect" || /(?:^|[.!?]\s*)$/u.test(precedingText.trim()));

const matchesLoreTermForm = (
  target: LoreTermTarget,
  term: string | undefined,
  precedingText: string
) =>
  target.term.toLowerCase() !== "effect" ||
  (term === target.term && !isPlainEffect(term, precedingText));

const skippedByLoreLinker = new Set(["a", "code", "pre", "th"]);

export const linkLoreTerms = (
  targets: readonly LoreTermTarget[],
  selfRoute: string,
  linkedRoutes: Set<string>,
  limit = 12,
  wovenTerms: Map<string, string> = new Map<string, string>()
) => {
  const byTerm = new Map(
    targets.map((target) => [target.term.toLowerCase(), target])
  );

  const linkedTerms = new Set<string>();
  const linkedTermRoutes = new Set<string>();
  const pattern = loreTermPattern(targets);

  const visit = (node: LoreHastNode, linked: number): number => {
    if (
      node.tagName !== undefined &&
      (skippedByLoreLinker.has(node.tagName) || /^h[1-6]$/u.test(node.tagName))
    ) {
      return linked;
    }

    const children = node.children ?? [];
    let count = linked;

    for (let index = 0; index < children.length && count < limit; index += 1) {
      const child = children[index];

      if (child === undefined) {
        continue;
      }

      if (child.type !== "text" || child.value === undefined) {
        count = visit(child, count);
        continue;
      }

      const replacement: LoreHastNode[] = [];
      let cursor = 0;

      for (const match of child.value.matchAll(pattern)) {
        const term = match.groups?.term;

        const target =
          term === undefined ? undefined : byTerm.get(term.toLowerCase());

        const start = match.index;

        if (
          target === undefined ||
          !matchesLoreTermForm(target, term, child.value.slice(0, start)) ||
          target.routePath === selfRoute ||
          linkedTerms.has(target.term.toLowerCase()) ||
          linkedTermRoutes.has(target.routePath) ||
          start === undefined
        ) {
          continue;
        }

        const end = start + match[0].length;
        replacement.push(
          { type: "text", value: child.value.slice(cursor, start) },
          {
            children: [{ type: "text", value: child.value.slice(start, end) }],
            properties: { href: target.routePath },
            tagName: "a",
            type: "element",
          }
        );
        cursor = end;
        count += 1;
        linkedTerms.add(target.term.toLowerCase());
        linkedTermRoutes.add(target.routePath);
        linkedRoutes.add(target.routePath);
        wovenTerms.set(target.routePath, target.term);
      }

      if (replacement.length > 0) {
        replacement.push({ type: "text", value: child.value.slice(cursor) });
        children.splice(index, 1, ...replacement);
        index += replacement.length - 1;
      }
    }

    return count;
  };

  return () => (tree: LoreHastNode) => {
    visit(tree, 0);
  };
};

export const loreLinkTargets = (
  sourcePath: string,
  markdown: string,
  knownRoutes: ReadonlySet<string>
): readonly string[] => {
  const targets = new Set<string>();

  for (const href of contentLinkHrefs(
    markdown.replaceAll("__RATSTACK_ORIGIN__", "https://parol6.build"),
    false
  )) {
    const target = new URL(href, "https://parol6.build");

    if (
      target.origin !== "https://parol6.build" ||
      !(
        target.pathname.startsWith("/lore/") ||
        target.pathname.startsWith("/systems/")
      )
    ) {
      continue;
    }

    const route = target.pathname.endsWith("/")
      ? target.pathname.slice(0, -1)
      : target.pathname;

    if (!knownRoutes.has(route)) {
      throw buildError(
        "lore link",
        sourcePath,
        violation(
          `linked lore page does not exist: ${route}.`,
          "Readers would follow the link to a 404.",
          "fix the link to an existing `/lore/` or `/systems/` route, or write the missing page under `.brain/`."
        )
      );
    }

    targets.add(route);
  }

  return [...targets];
};

export interface DebtEntry {
  readonly directive: string;
  readonly file: string;
  readonly kind: string;
  readonly line: number;
  readonly reason: string | undefined;
}

const DebtKind = Schema.Literals([
  "effect-diagnostics",
  "oxlint",
  "typescript",
]);

const DebtDiagnosticPayload = Schema.Struct({
  directive: Schema.String,
  kind: DebtKind,
  reason: Schema.optional(Schema.String),
});

const DebtLintSpan = Schema.Struct({
  column: Schema.Finite,
  length: Schema.Finite,
  line: Schema.Finite,
  offset: Schema.Finite,
});

const DebtLintDiagnostic = Schema.Struct({
  code: Schema.String,
  filename: Schema.String,
  labels: Schema.Array(Schema.Struct({ span: DebtLintSpan })),
  message: Schema.String,
  severity: Schema.Literals(["error", "warning"]),
});

const DebtLintOutput = Schema.Struct({
  diagnostics: Schema.Array(DebtLintDiagnostic),
  number_of_files: Schema.Finite,
  number_of_rules: Schema.Finite,
  start_time: Schema.Finite,
  threads_count: Schema.Finite,
});

export interface DebtLintResult {
  readonly entries: readonly DebtEntry[];
  readonly fileCount: number;
  readonly ruleCount: number;
}

export const assertSkillGroups = (
  skillNames: readonly string[],
  groups: readonly { readonly names: readonly string[] }[]
): void => {
  const groupedNames = new Set(groups.flatMap((group) => group.names));

  const ungrouped = skillNames
    .toSorted()
    .find((name) => !groupedNames.has(name));

  if (ungrouped !== undefined) {
    throw buildError(
      "skill grouping",
      `skills/${ungrouped}/SKILL.md`,
      violation(
        `Skill ${ungrouped} does not belong to a home-page group.`,
        "The home page lists every skill under a group, so an ungrouped skill disappears.",
        `add \`"${ungrouped}"\` to a group in \`skillGroups\` in \`apps/site/scripts/generate-content.ts\`.`
      )
    );
  }
};

export const isDebtSourcePath = (file: string) => {
  const segments = file.split("/");

  const excludedSegments = new Set([
    ".agent_sources",
    ".alchemy",
    ".turbo",
    "build",
    "coverage",
    "dist",
    "generated",
    "node_modules",
    "vendor",
  ]);

  if (
    segments.some((segment) => excludedSegments.has(segment)) ||
    file.startsWith("tools/oxlint/anti-slop/") ||
    /(?:\.generated|\.gen)\.[^.]+$/u.test(file)
  ) {
    return false;
  }

  const allowedRoot = /^(?:apps|packages|scripts|tools)\//u.test(file);
  const rootConfig = /^[^/]+\.config\.ts$/u.test(file);
  const sourceFile = /\.[cm]?[jt]sx?$/u.test(file);

  return sourceFile && (allowedRoot || rootConfig);
};

export const parseDebtLintOutput = (raw: string): DebtLintResult => {
  try {
    const output = Schema.decodeSync(Schema.fromJsonString(DebtLintOutput))(
      raw
    );

    const entries = output.diagnostics.map((diagnostic) => {
      if (diagnostic.code !== "rat-stack-debt(debt-ledger)") {
        throw new Error(`Unexpected lint rule: ${diagnostic.code}`);
      }

      const [label] = diagnostic.labels;

      if (label === undefined) {
        throw new Error(`Missing source location: ${diagnostic.filename}`);
      }

      const payload = Schema.decodeSync(
        Schema.fromJsonString(DebtDiagnosticPayload)
      )(diagnostic.message);

      return {
        directive: payload.directive,
        file: diagnostic.filename,
        kind: payload.kind,
        line: label.span.line,
        reason: payload.reason,
      };
    });

    return {
      entries: entries.toSorted(
        (left, right) =>
          left.file.localeCompare(right.file) ||
          left.line - right.line ||
          left.directive.localeCompare(right.directive)
      ),
      fileCount: output.number_of_files,
      ruleCount: output.number_of_rules,
    };
  } catch (error) {
    throw buildError("debt lint output", "oxlint JSON", error);
  }
};

const tableRowPrefix = "| cell |\n| --- |\n| ";

const firstCellHtml = (cell: string) => {
  let start: number | undefined;

  visitContentNodes(
    parseContentMarkdown(`${tableRowPrefix}${cell} |\n`),
    (node) => {
      const offset = node.position?.start.offset;

      if (node.type === "html" && offset !== undefined && start === undefined) {
        start = offset - tableRowPrefix.length;
      }
    }
  );

  return start;
};

const escapeCellHtml = (cell: string): string => {
  const start = firstCellHtml(cell);

  return start === undefined
    ? cell
    : escapeCellHtml(`${cell.slice(0, start)}\\${cell.slice(start)}`);
};

const escapeCellPipes = (cell: string) => {
  let escaped = "";
  let backslashes = 0;

  for (let index = 0; index < cell.length; index += 1) {
    const character = cell.charAt(index);

    escaped += character === "|" && backslashes % 2 === 0 ? "\\|" : character;
    backslashes = character === "\\" ? backslashes + 1 : 0;
  }

  return escaped;
};

const tableCell = (value: string) =>
  escapeCellHtml(escapeCellPipes(value.replaceAll(/\s+/gu, " ").trim()));

export const debtLedgerMarkdown = (entries: readonly DebtEntry[]) => {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    counts.set(entry.kind, (counts.get(entry.kind) ?? 0) + 1);
  }

  const countRows = [...counts]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([kind, count]) => `- **${kind}**: ${count}`);

  const rows = entries.map((entry) => {
    const link = `https://github.com/joelhooks/PAROL6/blob/main/${entry.file}#L${entry.line}`;
    const reason = entry.reason ?? "no reason given";

    return `- **[${entry.file}:${entry.line}](${link})**\n  - Directive: ${tableCell(entry.directive)}\n  - Reason: ${tableCell(reason)}`;
  });

  return [
    "# Debt ledger",
    "",
    '> "Debt only shrinks."',
    "",
    `Total: **${entries.length}** directives.`,
    "",
    "## Count by directive kind",
    "",
    ...countRows,
    "",
    "The vendored `tools/oxlint/anti-slop/` plugin is excluded. It is Dillon Mulroy's code, not our debt.",
    "",
    "## Every directive",
    "",
    ...rows,
    "",
  ].join("\n");
};

const linkHrefs = contentLinkHrefs;

export const internalRouteForLink = (
  href: string,
  pageRoute: string,
  origin = "https://parol6.build"
): string | undefined => {
  try {
    const base = new URL(pageRoute, origin);
    const target = new URL(href, base);

    if (target.origin !== base.origin) {
      return undefined;
    }

    return target.pathname.length > 1
      ? target.pathname.replace(/\/$/u, "")
      : target.pathname;
  } catch {
    return undefined;
  }
};

export const validateInternalLinks = (options: {
  readonly knownRoutes: ReadonlySet<string>;
  readonly pageRoute: string;
  readonly sourcePath: string;
  readonly text: string;
}): void => {
  for (const href of linkHrefs(options.text)) {
    const route = internalRouteForLink(href, options.pageRoute);

    if (route !== undefined && !options.knownRoutes.has(route)) {
      throw buildError(
        `internal link ${href}`,
        options.sourcePath,
        violation(
          `resolves to unserved route ${route}.`,
          "Readers would follow the link to a 404.",
          `change the link to a published route, or publish a page at \`${route}\`.`
        )
      );
    }
  }
};

export { copyPrompts } from "./component-data.ts";

export type { CopyPromptSpec } from "./component-data.ts";

export const renderBibliography = (sources: readonly BibliographySource[]) => {
  const registry = createComponentRegistry();
  const context = componentContext({ sources });

  const input = {
    attributes: {},
    children: contentRoot([]),
    name: "Sources",
    placement: "block",
  } satisfies ComponentInput;

  return {
    html: stringifyContentMarkdown(
      contentRoot(renderComponent(registry, "human", input, context))
    ).trim(),
    markdown:
      sources.length === 0
        ? ""
        : `\n\n${stringifyContentMarkdown(
            contentRoot(renderComponent(registry, "agent", input, context))
          )}`,
  };
};

interface ImageHastNode {
  readonly type: string;
  readonly tagName?: string;
  readonly value?: string;
  children?: ImageHastNode[];
  readonly properties?: { readonly src?: string };
}

const emptiedByImageRemoval = new Set(["a", "p"]);

const loadsFromThisSite = (source: string) =>
  source.startsWith("data:") ||
  (source.startsWith("/") && !source.startsWith("//"));

const carriesContent = (node: ImageHastNode) =>
  node.type !== "text" || (node.value ?? "").trim() !== "";

export const dropOffSiteImages = () => (tree: ImageHastNode) => {
  const keep = (node: ImageHastNode): boolean => {
    if (node.tagName === "img") {
      return loadsFromThisSite(node.properties?.src ?? "");
    }

    if (node.children === undefined) {
      return true;
    }

    const before = node.children.length;
    node.children = node.children.filter(keep);

    return (
      node.children.length === before ||
      !emptiedByImageRemoval.has(node.tagName ?? "") ||
      node.children.some(carriesContent)
    );
  };

  keep(tree);
};

export const withMarkdownTitle = (
  source: string,
  title: string,
  bodyHtml: string
): string =>
  countHtmlElements(bodyHtml, "h1") > 0
    ? source
    : `# ${title}\n\n${scanLeadingFrontmatterFence(source, title).body.trimStart()}`;

export const assertDocumentTitle = (html: string, sourcePath: string) => {
  const count = countHtmlElements(html, "h1");

  if (count !== 1) {
    throw buildError(
      "document title",
      sourcePath,
      violation(
        `Expected exactly one H1, found ${count}.`,
        "The H1 is the page title for readers, search, and the agent pointer.",
        "keep one `# Title` heading at the top, and demote any other to `##`."
      )
    );
  }
};

export const deriveAgentMarkdown = (
  source: string,
  registry = createComponentRegistry()
): string => renderSvxMarkdown(source, "agent", {}, registry);

export const deriveHtmlMarkdown = (
  source: string,
  renderPrompt: (spec: CopyPromptSpec) => string = () => "",
  registry = createComponentRegistry()
): string =>
  renderSvxMarkdown(
    source,
    "human",
    { renderCopyPrompt: renderPrompt },
    registry
  );

export const hasAudienceSyntax = (source: string) => {
  let found = false;
  visitContentNodes(parseContentMarkdown(source), (node) => {
    if (
      node.type === "html" &&
      htmlTokens(node.value).some(
        (token) => token.name.charAt(0) >= "A" && token.name.charAt(0) <= "Z"
      )
    ) {
      found = true;
    }
  });

  return found;
};

interface IcoImage {
  readonly bytes: Uint8Array;
  readonly size: number;
}

export const encodeIco = (images: readonly IcoImage[]): Uint8Array => {
  const headerSize = 6 + images.length * 16;

  const total = images.reduce(
    (length, image) => length + image.bytes.length,
    headerSize
  );

  const ico = new Uint8Array(total);
  const view = new DataView(ico.buffer);
  view.setUint16(2, 1, true);
  view.setUint16(4, images.length, true);
  let offset = headerSize;

  for (const [index, image] of images.entries()) {
    const entry = 6 + index * 16;
    view.setUint8(entry, image.size % 256);
    view.setUint8(entry + 1, image.size % 256);
    view.setUint16(entry + 4, 1, true);
    view.setUint16(entry + 6, 32, true);
    view.setUint32(entry + 8, image.bytes.length, true);
    view.setUint32(entry + 12, offset, true);
    ico.set(image.bytes, offset);
    offset += image.bytes.length;
  }

  return ico;
};
