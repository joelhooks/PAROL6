export const readerRoutePaths: readonly string[] = [
  "/",
  "/learn",
  "/news",
  "/directory",
  "/all-stars",
  "/search",
];

export const readerBodyRoutePaths: readonly string[] = [
  "/AGENTS.md",
  "/README.md",
  "/VISION.md",
  "/debt.md",
  "/glossary",
  "/log",
  "/log.md",
  "/pins.md",
  "/tokenmaxx",
  "/vendor/README.md",
];

export const isAllStarsProfilePath = (path: string) =>
  /^\/all-stars\/[a-z0-9](?:[a-z0-9-]{0,38})$/u.test(path);

export const isReaderBodyRoutePath = (path: string) =>
  readerBodyRoutePaths.includes(path) || isAllStarsProfilePath(path);

export const isWorkerFirstReaderRoute = (path: string) =>
  path === "/prompts" || path.startsWith("/prompts/");

export const readerNoStoreRoutePaths: readonly string[] = ["/tokenmaxx"];

export const isReaderRoutePath = (path: string) =>
  readerRoutePaths.includes(path) ||
  isReaderBodyRoutePath(path) ||
  path === "/lore" ||
  path.startsWith("/lore/") ||
  path === "/systems" ||
  path.startsWith("/systems/") ||
  path === "/skills" ||
  path.startsWith("/skills/") ||
  path === "/prompts" ||
  /^\/prompts\/[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(path);
