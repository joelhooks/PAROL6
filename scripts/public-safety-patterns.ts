export interface PrivatePattern {
  readonly allowedMatches?: RegExp;
  readonly allowedPaths?: readonly string[];
  readonly label: string;
  readonly pattern: RegExp;
}

export const exemptPaths: readonly string[] = [
  "scripts/public-safety-patterns.ts",
];

const publicEmails =
  /@(?:[\w-]+\.)*(?:example\.(?:com|net|org)|example|invalid|localhost|test)$|@users\.noreply\.github\.com$|^\+?(?:workshop@ratstack\.sh|claudebot@anthropic\.com)$/iu;

export const privatePatterns: readonly PrivatePattern[] = [
  {
    allowedMatches: publicEmails,
    allowedPaths: ["packages/intake-live/test/contact-shapes.ts"],
    label: "an email address",
    pattern:
      /[\w.%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?![\w-]*\.[a-z0-9])/giu,
  },
  {
    label: "a street address",
    pattern:
      /\b\d{1,5}(?:\s+[A-Z][a-z]+){1,3}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Terrace|Parkway|Pkwy|Highway|Hwy)\b\.?/gu,
  },
  { label: "the private tailnet name", pattern: /tail7af24/giu },
  { label: "a tailnet hostname", pattern: /[\w-]+\.ts\.net\b/giu },
  { label: "a local home directory", pattern: /\/Users\/joel\b/gu },
  { label: "the private build brain", pattern: /parol6-brain/giu },
  {
    allowedPaths: [".gitignore"],
    label: "a Muster path",
    pattern:
      /\bmuster-heavy\b|\.pi\/muster\b|\/state\/muster\b|\bmuster\/roster\b|\bmuster\/gates\b/giu,
  },
  {
    label: "a private Pi path",
    pattern: /~\/\.pi\/|\.pi\/agent\b|\.pi\/sessions\b/gu,
  },
  {
    label: "an order number",
    pattern:
      /\border\s*(?:no\.?|number|num|id|#)\s*[:#]?\s*[A-Z0-9][A-Z0-9-]{4,}\b|\b\d{3}-\d{7}-\d{7}\b/giu,
  },
  {
    label: "a tracking number",
    pattern:
      /\b1Z[0-9A-Z]{16}\b|\b9[2-5]\d{20}\b|\btracking\s*(?:no\.?|number|num|id|#)?\s*[:#]?\s*[A-Z0-9]{10,}\b/giu,
  },
];
