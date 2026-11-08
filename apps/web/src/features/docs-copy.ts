export const searchCopy = {
  agents: "lists the search and read tools for agents.",
  description:
    "Search every page of the PAROL6 build wiki in your browser, then open the matching page.",
  heading: "Search the wiki",
  intro:
    "Search the milestones, build steps, parts, concepts, videos and sources. Open a match to read its page.",
  noscript:
    "Search runs in your browser and needs JavaScript. Without it, start at the wiki index.",
  queryLabel: "Search query",
};

export const resultCount = (count: number) =>
  `${count} ${count === 1 ? "result" : "results"}`;
