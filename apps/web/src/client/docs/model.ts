import { ReadOutput } from "@rat-stack/core/contracts";
import { Option, Schema } from "effect";
import { defineTaggedUnion } from "foldkit/schema";

import { AppRoute } from "../../features/route.js";
import { WikiSearchEntry, WikiSearchResult } from "./wiki-search.js";

export const SearchState = defineTaggedUnion({
  Idle: {},
  Loaded: { query: Schema.String, result: WikiSearchResult },
});

export const ReadState = defineTaggedUnion({
  Failed: { message: Schema.String, notFound: Schema.Boolean },
  Idle: {},
  Loaded: { document: ReadOutput },
  Loading: {},
});

export const Model = Schema.Struct({
  generation: Schema.Finite,
  index: Schema.Array(WikiSearchEntry),
  query: Schema.String,
  read: ReadState,
  route: AppRoute,
  search: SearchState,
});

export type AppModel = typeof Model.Type;

export const initialModel: AppModel = {
  generation: 0,
  index: [],
  query: "",
  read: ReadState.Idle(),
  route: AppRoute.Search({ q: Option.none() }),
  search: SearchState.Idle(),
};
