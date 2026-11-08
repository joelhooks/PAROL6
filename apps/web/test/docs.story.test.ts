import { expect, it } from "@effect/vitest";
import { Option, Schema } from "effect";
import * as Arbitrary from "effect/Arbitrary";
import { Command, given, message, model, story } from "foldkit/story";
import { fromString } from "foldkit/url";

import { ReplaceUrl } from "../src/client/docs/command.js";
import { Message } from "../src/client/docs/message.js";
import { SearchState } from "../src/client/docs/model.js";
import { queryTerms, searchWiki } from "../src/client/docs/wiki-search.js";
import type { WikiSearchEntryValue } from "../src/client/docs/wiki-search.js";
import { update } from "../src/features/app.js";
import { AppRoute, parseRoute } from "../src/features/route.js";
import { docsHome } from "./docs-fixture.js";

const Word = Schema.Literals([
  "homing",
  "jog",
  "jogging",
  "motor",
  "gearbox",
  "skiff",
  "patch",
  "sensor",
  "TMC5160",
]);

const Words = Schema.Array(Word);

const GeneratedEntry = Schema.Struct({
  description: Words,
  terms: Words,
  text: Words,
  title: Words,
});

const toEntry = (
  generated: typeof GeneratedEntry.Type,
  index: number
): WikiSearchEntryValue => ({
  description: generated.description.join(" "),
  routePath: `/lore/page-${index}`,
  terms: generated.terms,
  text: generated.text.join(" "),
  title: generated.title.join(" "),
});

const haystack = (entry: WikiSearchEntryValue) =>
  [entry.title, entry.description, entry.terms.join(" "), entry.text]
    .join(" ")
    .toLowerCase();

const mentions = (entry: WikiSearchEntryValue, terms: readonly string[]) =>
  terms.some((term) => haystack(entry).includes(term));

it.prop(
  "search returns exactly the pages that mention a query term, best score first",
  {
    entries: Arbitrary.schema(Schema.Array(GeneratedEntry)),
    query: Arbitrary.schema(Words),
  },
  ({ entries, query }) => {
    const pages = entries.map(toEntry);
    const terms = queryTerms(query.join(" "));
    const result = searchWiki(pages, query.join(" "), pages.length + 1);

    expect(result.total).toBe(
      terms.length === 0
        ? 0
        : pages.filter((page) => mentions(page, terms)).length
    );

    expect(result.matches).toHaveLength(result.total);

    for (const match of result.matches) {
      const page = pages.find((entry) => entry.routePath === match.routePath);

      expect(page !== undefined && mentions(page, terms)).toBe(true);
    }

    for (const [index, match] of result.matches.entries()) {
      expect(match.score).toBeLessThanOrEqual(
        result.matches[index - 1]?.score ?? Number.POSITIVE_INFINITY
      );
    }
  }
);

it("a submitted query loads its matches at once and only writes the URL", () => {
  story(
    update,
    given(docsHome),
    message(Message.UpdatedQuery({ value: " homing " })),
    message(Message.SubmittedSearch()),
    Command.expectExact(ReplaceUrl({ url: "/search?q=homing" })),
    Command.resolve(ReplaceUrl, Message.CompletedNavigate()),
    model((current) => {
      expect(current.query).toBe("homing");
      expect(
        SearchState.match(current.search, {
          Idle: () => [],
          Loaded: ({ result }) => result.matches.map((match) => match.title),
        })
      ).toStrictEqual(["M3. The whole arm moves"]);
    }),
    Command.expectNone()
  );
});

const typedQuery = Arbitrary.schema(
  Schema.String.check(Schema.makeFilter((text) => !/\p{Cs}/u.test(text)))
);

const isUrlArgs = Schema.is(Schema.Struct({ url: Schema.String }));

it.prop(
  "the URL a submitted search writes reopens the same trimmed query",
  { query: typedQuery },
  ({ query }) => {
    const submitted = update(
      update(docsHome, Message.UpdatedQuery({ value: query })).model,
      Message.SubmittedSearch()
    );

    const written = (submitted.commands ?? []).flatMap((command) =>
      command.name === "ReplaceUrl" && isUrlArgs(command.args)
        ? [command.args.url]
        : []
    );

    if (query.trim().length === 0) {
      expect(written).toStrictEqual([]);

      return;
    }

    expect(written).toHaveLength(1);

    const reopened = parseRoute(
      Option.getOrThrow(fromString(`https://parol6.build${written[0] ?? ""}`))
    );

    expect(reopened).toStrictEqual(
      AppRoute.Search({ q: Option.some(query.trim()) })
    );
  }
);
