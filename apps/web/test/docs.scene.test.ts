import { it } from "@effect/vitest";
import { Option } from "effect";
import {
  Command,
  Subscription,
  click,
  expect,
  given,
  keydown,
  role,
  scene,
  text,
  type,
} from "foldkit/scene";
import { fromString } from "foldkit/url";

import { ReplaceUrl } from "../src/client/docs/command.js";
import { Message } from "../src/client/docs/message.js";
import { Message as ReaderMessage } from "../src/client/reader/message.js";
import { update as readerUpdate } from "../src/client/reader/update.js";
import { update, view } from "../src/features/app.js";
import { view as readerView } from "../src/features/reader.js";
import { docsHome, searchPage } from "./docs-fixture.js";

const searchBox = role("textbox", { name: "Search query" });

const searchButton = role("button", { name: "Search" });

const arrivedAt = (path: string) =>
  ReaderMessage.GotDocsMessage({
    message: Message.ChangedUrl({
      url: Option.getOrThrow(fromString(`https://parol6.build${path}`)),
    }),
  });

it("a search with no matching page says so and links nothing", () => {
  scene(
    { update, view },
    given(docsHome),
    type(searchBox, "flux capacitor"),
    click(searchButton),
    Command.expectExact(ReplaceUrl({ url: "/search?q=flux+capacitor" })),
    Command.resolve(ReplaceUrl, Message.CompletedNavigate()),
    expect(text("0 results")).toExist(),
    expect(
      role("link", { name: "M1. Bench it: power, one motor, a safe stop" })
    ).toBeAbsent()
  );
});

it("the /search page preloads ?q=, searches again on Enter, puts the query in the URL, and links each match to its page", () => {
  scene(
    { update: readerUpdate, view: readerView },
    given(searchPage),
    expect(role("heading", { name: "Search the wiki" })).toExist(),
    expect(text("Matches appear here.")).toExist(),
    Subscription.emit(arrivedAt("/search?q=homing")),
    Command.expectNone(),
    expect(searchBox).toHaveValue("homing"),
    expect(text("1 result")).toExist(),
    expect(role("link", { name: "M3. The whole arm moves" })).toHaveAttr(
      "href",
      "/lore/m3-whole-arm"
    ),
    type(searchBox, " tmc5160 "),
    keydown(searchBox, "Enter"),
    Command.expectExact(ReplaceUrl({ url: "/search?q=tmc5160" })),
    Command.resolve(ReplaceUrl, Message.CompletedNavigate()),
    expect(
      role("link", { name: "M1. Bench it: power, one motor, a safe stop" })
    ).toHaveAttr("href", "/lore/m1-bench-it"),
    expect(role("link", { name: "M3. The whole arm moves" })).toBeAbsent(),
    Command.expectNone()
  );
});
