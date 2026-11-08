export interface SourceSpec {
  readonly description: string;
  readonly routePath: `/${string}`;
  readonly sourcePath: string;
  readonly title: string;
}

export const lawSpecs: readonly SourceSpec[] = [
  {
    description:
      "What you may change, which commands to run, and which changes need approval.",
    routePath: "/AGENTS.md",
    sourcePath: "AGENTS.md",
    title: "Agent rules for the PAROL6 wiki (AGENTS.md)",
  },
  {
    description: "What the PAROL6 build wiki is for and who it serves.",
    routePath: "/VISION.md",
    sourcePath: "VISION.md",
    title: "Purpose of the PAROL6 build wiki (VISION.md)",
  },
  {
    description: "What is in the repo and how to run the wiki locally.",
    routePath: "/README.md",
    sourcePath: "README.md",
    title: "Build and run the PAROL6 wiki (README.md)",
  },
  {
    description:
      "How to pin an unpublished package and when to remove the local copy.",
    routePath: "/vendor/README.md",
    sourcePath: "vendor/README.md",
    title: "Dependency vendoring rules (vendor/README.md)",
  },
  {
    description:
      "How the milestone pages become a learn deck that runs M1 to M7 in build order.",
    routePath: "/learn",
    sourcePath: ".brain/resources/learn-mode.svx",
    title: "Learn the PAROL6 build as cards",
  },
];
