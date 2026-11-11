import { Array, Option, pipe } from "effect";

export interface WikiLink {
  readonly href: string;
  readonly label: string;
}

export interface WikiSection {
  readonly href: string;
  readonly links: readonly WikiLink[];
  readonly title: string;
}

const lore = (slug: string) => `/lore/${slug}`;

export const wikiHome: WikiLink = { href: "/", label: "PAROL6 wiki" };

export const wikiSections: readonly WikiSection[] = [
  {
    href: "/",
    links: [
      { href: "/", label: "Start here" },
      { href: lore("milestones"), label: "How milestones work" },
      { href: "/log", label: "Recent changes" },
    ],
    title: "Start",
  },
  {
    href: lore("milestones"),
    links: [
      { href: lore("m1-bench-it"), label: "M1. Bench it" },
      { href: lore("m2-one-joint"), label: "M2. One joint" },
      { href: lore("m3-whole-arm"), label: "M3. The whole arm" },
      { href: lore("lerobot"), label: "LeRobot (planned)" },
      { href: lore("m4-pick-and-place"), label: "M4. Pick and place" },
      { href: lore("m5-touch-the-skiff"), label: "M5. Touch the skiff" },
      { href: lore("m6-patch-a-cable"), label: "M6. Patch a cable" },
      { href: lore("m7-play-it"), label: "M7. Play it" },
    ],
    title: "Milestones",
  },
  {
    href: lore("build-steps"),
    links: [{ href: lore("build-steps"), label: "Build steps by milestone" }],
    title: "Build steps",
  },
  {
    href: lore("parts"),
    links: [{ href: lore("parts"), label: "Parts by milestone" }],
    title: "Parts",
  },
  {
    href: lore("concepts"),
    links: [
      { href: lore("concepts"), label: "Concepts by milestone" },
      { href: "/glossary", label: "Glossary" },
    ],
    title: "Concepts and glossary",
  },
  {
    href: lore("videos"),
    links: [
      { href: lore("videos"), label: "All milestone videos" },
      ...Array.map([1, 2, 3, 4, 5, 6, 7], (index): WikiLink => ({
        href: lore(`video-m${index}`),
        label: `M${index} video`,
      })),
      { href: lore("timelapses"), label: "Print timelapses" },
    ],
    title: "Videos",
  },
  {
    href: lore("skiff-target"),
    links: [{ href: lore("skiff-target"), label: "The skiff target" }],
    title: "Skiff",
  },
  {
    href: lore("sources"),
    links: [
      { href: lore("sources"), label: "Sources and licences" },
      { href: "/lore", label: "All pages" },
      { href: "/search", label: "Search" },
    ],
    title: "Sources",
  },
];

export const wikiPaths: readonly string[] = pipe(
  wikiSections,
  Array.flatMap((section) => [
    section.href,
    ...section.links.map((link) => link.href),
  ]),
  Array.dedupe
);

export interface WikiTrail {
  readonly page: WikiLink;
  readonly section: WikiSection;
}

export const wikiTrailFor = (path: string): Option.Option<WikiTrail> =>
  Array.findFirst(wikiSections, (section) =>
    pipe(
      Array.findFirst(section.links, (link) => link.href === path),
      Option.map((page) => ({ page, section }))
    )
  );
