import { Option } from "effect";

import {
  initialModel as docsInitialModel,
  Model,
  ReadState,
  SearchState,
} from "../src/client/docs/model.js";
import type { WikiSearchEntryValue } from "../src/client/docs/wiki-search.js";
import { initialModel } from "../src/client/reader/model.js";
import { AppRoute } from "../src/features/route.js";
import { readerFlagsFixture } from "./reader-fixture.js";

export const wikiIndex: readonly WikiSearchEntryValue[] = [
  {
    description: "Power the board, turn one motor, stop it safely.",
    routePath: "/lore/m1-bench-it",
    terms: ["TMC5160"],
    text: "The control board takes six TMC5160 drivers.",
    title: "M1. Bench it: power, one motor, a safe stop",
  },
  {
    description: "Build the rest of the arm, then home and jog it.",
    routePath: "/lore/m3-whole-arm",
    terms: ["homing"],
    text: "Homing is the only position reference.",
    title: "M3. The whole arm moves",
  },
];

export const docsHome = Model.make({
  generation: 0,
  index: wikiIndex,
  query: "",
  read: ReadState.Idle(),
  route: AppRoute.Search({ q: Option.none() }),
  search: SearchState.Idle(),
});

export const searchPage = initialModel({
  ...readerFlagsFixture,
  blocks: [],
  copyPrompts: [],
  docs: Option.some({ ...docsInitialModel, index: wikiIndex }),
  heading: "Search the wiki",
  page: {
    ...readerFlagsFixture.page,
    metadata: {
      ...readerFlagsFixture.page.metadata,
      canonicalPath: "/search",
      title: "Search the wiki | PAROL6 build",
    },
    path: "/search",
  },
});
