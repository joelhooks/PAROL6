import { Effect, FileSystem, Path, Schema } from "effect";

import {
  initialModel,
  Model as DocsModel,
} from "../../web/src/client/docs/model.ts";
import type { WikiSearchEntryValue } from "../../web/src/client/docs/wiki-search.ts";
import { searchCopy } from "../../web/src/features/docs-copy.ts";
import { SearchResource } from "../src/content-data.ts";
import { ReaderInputError } from "./reader-input-error.ts";
import { prepareReaderSiteInputs } from "./reader-site-inputs.ts";

const searchPath = "/search";

const searchSourcePath = "apps/web/src/features/app.ts";

const searchCatalog = Schema.Struct({
  data: Schema.Array(SearchResource),
  generation: Schema.String,
});

export const plainSearchText = (markdown: string) =>
  markdown
    .replaceAll(/```[\s\S]*?```/gu, " ")
    .replaceAll(/!?\[(?<label>[^\]]*)\]\([^)]*\)/gu, "$<label>")
    .replaceAll(/^#{1,6}\s+/gmu, "")
    .replaceAll(/[*_`]+/gu, "")
    .replaceAll(/\s+/gu, " ")
    .trim();

export const wikiSearchEntries = (
  resources: readonly (typeof SearchResource.Type)[]
): readonly WikiSearchEntryValue[] =>
  resources.flatMap((resource) =>
    resource.kind === "lore" && resource.routePath.startsWith("/lore/")
      ? [
          {
            description: resource.description,
            routePath: resource.routePath,
            terms: resource.terms,
            text: plainSearchText(resource.text),
            title: resource.title,
          },
        ]
      : []
  );

export const readerSearchFlags = Effect.fn("readerSearchFlags")(
  function* readerSearchFlags(origin: string) {
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const inputs = yield* prepareReaderSiteInputs;
    const descriptor = inputs.pages.find((entry) => entry.path === searchPath);

    if (descriptor === undefined) {
      return yield* new ReaderInputError({
        message: `The content manifest has no ${searchPath} page; regenerate content before preparing the reader`,
        sourcePath: searchSourcePath,
      });
    }

    const catalog = yield* fs
      .readFileString(paths.join(inputs.directory, "_content/search.json"))
      .pipe(
        Effect.flatMap(
          Schema.decodeUnknownEffect(Schema.fromJsonString(searchCatalog))
        ),
        Effect.mapError(
          (cause) =>
            new ReaderInputError({
              cause,
              message:
                "Cannot read the built search index _content/search.json; regenerate content before preparing the reader",
              sourcePath: searchSourcePath,
            })
        )
      );

    return {
      agentMarkdown: undefined,
      bibliography: [],
      blocks: [],
      codeFences: [],
      copyPrompts: [],
      docs: yield* Schema.encodeEffect(DocsModel)({
        ...initialModel,
        index: wikiSearchEntries(catalog.data),
      }),
      heading: searchCopy.heading,
      origin,
      page: {
        generation: inputs.generation,
        metadata: descriptor.metadata,
        path: searchPath,
        sourcePath: searchSourcePath,
        status: 200,
      },
      snippets: [],
      terms: [],
    };
  }
);
