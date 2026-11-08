import { Schema } from "effect";

export const WikiSearchEntry = Schema.Struct({
  description: Schema.String,
  routePath: Schema.String,
  terms: Schema.Array(Schema.String),
  text: Schema.String,
  title: Schema.String,
});

export type WikiSearchEntryValue = typeof WikiSearchEntry.Type;

export const WikiMatch = Schema.Struct({
  description: Schema.String,
  excerpt: Schema.String,
  routePath: Schema.String,
  score: Schema.Finite,
  title: Schema.String,
});

export const WikiSearchResult = Schema.Struct({
  matches: Schema.Array(WikiMatch),
  total: Schema.Finite,
});

export type WikiSearchResultValue = typeof WikiSearchResult.Type;

export const queryTerms = (query: string): readonly string[] =>
  query
    .toLowerCase()
    .split(/[^\p{L}\p{N}@._/-]+/u)
    .filter((term) => term.length > 1);

const occurrences = (value: string, term: string) =>
  value.split(term).length - 1;

const sum = (values: readonly number[]) => {
  let total = 0;

  for (const value of values) {
    total += value;
  }

  return total;
};

const excerptLength = 220;

const excerptAround = (text: string, terms: readonly string[]) => {
  const lower = text.toLowerCase();

  const index =
    terms.map((term) => lower.indexOf(term)).find((found) => found !== -1) ??
    -1;

  const start = Math.max(0, index - 80);
  const body = text.slice(start, start + excerptLength).trim();

  return `${start > 0 ? "…" : ""}${body}${start + excerptLength < text.length ? "…" : ""}`;
};

const scoreOf = (
  entry: WikiSearchEntryValue,
  terms: readonly string[],
  phrase: string
) => {
  const title = entry.title.toLowerCase();
  const description = entry.description.toLowerCase();
  const pageTerms = entry.terms.join(" ").toLowerCase();
  const text = entry.text.toLowerCase();

  return (
    (title.includes(phrase) ? 40 : 0) +
    sum(
      terms.map(
        (term) =>
          occurrences(title, term) * 12 +
          occurrences(pageTerms, term) * 12 +
          occurrences(description, term) * 6 +
          Math.min(10, occurrences(text, term))
      )
    )
  );
};

export const searchWiki = (
  entries: readonly WikiSearchEntryValue[],
  query: string,
  limit = 20
): WikiSearchResultValue => {
  const terms = queryTerms(query);

  if (terms.length === 0) {
    return { matches: [], total: 0 };
  }

  const phrase = terms.join(" ");

  const scored = entries
    .flatMap((entry) => {
      const score = scoreOf(entry, terms, phrase);

      return score > 0 ? [{ entry, score }] : [];
    })
    .toSorted(
      (left, right) =>
        right.score - left.score ||
        left.entry.title.localeCompare(right.entry.title)
    );

  return {
    matches: scored.slice(0, limit).map(({ entry, score }) => ({
      description: entry.description,
      excerpt: excerptAround(entry.text, terms),
      routePath: entry.routePath,
      score,
      title: entry.title,
    })),
    total: scored.length,
  };
};
