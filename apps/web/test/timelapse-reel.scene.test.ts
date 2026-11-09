import { NodeServices } from "@effect/platform-node";
import { expect as expectValue, it } from "@effect/vitest";
import { Effect, Option, Schema } from "effect";
import * as Arbitrary from "effect/Arbitrary";
import {
  Command,
  Subscription,
  all,
  expect,
  expectAll,
  first,
  given,
  nth,
  scene,
  selector,
  text,
  within,
} from "foldkit/scene";

import { readerHomeFlags } from "../../site/scripts/reader-home-flags.ts";
import { timelapseReel } from "../../site/scripts/timelapse-components.ts";
import {
  Timelapse,
  timelapses,
  timelapseVideoUrl,
} from "../../site/scripts/timelapses.ts";
import type { TimelapseEntry } from "../../site/scripts/timelapses.ts";
import {
  ReaderBlock,
  TimelapseReelTile,
} from "../src/client/reader-document.js";
import { PlayTimelapseReel } from "../src/client/reader/command.js";
import { Message } from "../src/client/reader/message.js";
import { ReaderFlags } from "../src/client/reader/model.js";
import { update } from "../src/client/reader/update.js";
import { view } from "../src/features/reader.js";
import { timelapseReelText } from "../src/features/timelapse-reel.js";
import { readerModelFixture } from "./reader-fixture.js";

const reelBlock = (entries: readonly TimelapseEntry[]) => {
  const reel = timelapseReel(entries);

  return ReaderBlock.TimelapseReel({
    allHref: reel.allHref,
    latest: Option.fromUndefinedOr(reel.latest),
    tiles: reel.tiles.map((tile) => Schema.decodeSync(TimelapseReelTile)(tile)),
  });
};

const modelWithReel = (entries: readonly TimelapseEntry[]) => ({
  ...readerModelFixture,
  blocks: [reelBlock(entries)],
});

const entriesArbitrary = Arbitrary.schema(
  Schema.Array(Timelapse).check(Schema.isMaxLength(7))
).pipe(
  Arbitrary.map((entries) =>
    entries.map((entry, index) => ({
      ...entry,
      id: `plate${index}`,
      title: `Plate ${index}`,
    }))
  )
);

const newestUploaded = (entries: readonly TimelapseEntry[]) =>
  entries.findLast((entry) => entry.playback !== undefined);

const tile = all.selector(".timelapse-tile");

it.prop(
  "the reel plays the newest uploaded plate and tiles every printing plate before up to three earlier ones",
  { entries: entriesArbitrary },
  ({ entries }) => {
    const newest = newestUploaded(entries);
    const uploaded = entries.filter((entry) => entry.playback !== undefined);
    const printing = entries.filter((entry) => entry.playback === undefined);

    scene(
      { update, view },
      given(modelWithReel(entries)),
      newest?.playback === undefined
        ? expect(selector("video")).not.toExist()
        : expect(selector("video")).toHaveAttr(
            "src",
            timelapseVideoUrl(newest.playback.id)
          ),
      expectAll(tile).toHaveCount(
        printing.length + Math.min(3, Math.max(0, uploaded.length - 1))
      ),
      expectAll(all.text(timelapseReelText.printing)).toHaveCount(
        printing.length
      ),
      ...printing
        .toReversed()
        .flatMap((entry, index) => [
          expect(nth(tile, index)).toContainText(entry.title),
          expect(
            within(nth(tile, index), text(timelapseReelText.printing))
          ).toExist(),
        ]),
      expect(text(timelapseReelText.all)).toExist()
    );
  }
);

it.effect(
  "the homepage shows the newest uploaded timelapse first, above Start here",
  () =>
    Effect.gen(function* checkHomeReel() {
      const flags = yield* Effect.flatMap(
        readerHomeFlags("https://parol6.build"),
        Schema.decodeUnknownEffect(ReaderFlags)
      );

      const reelIndex = flags.blocks.findIndex(
        ReaderBlock.guards.TimelapseReel
      );

      const startHereIndex = flags.blocks.findIndex(
        (block) =>
          ReaderBlock.guards.Heading(block) && block.title === "Start here"
      );

      expectValue(reelIndex).toBeGreaterThan(-1);
      expectValue(reelIndex).toBeLessThan(startHereIndex);

      const newest = yield* Effect.fromNullishOr(newestUploaded(timelapses));
      const playback = yield* Effect.fromNullishOr(newest.playback);

      const pending = {
        ...newest,
        id: "fixture-on-the-printer",
        playback: undefined,
        title: "Fixture plate on the printer",
      };

      scene(
        { update, view },
        given({
          ...readerModelFixture,
          blocks: flags.blocks.map((block) =>
            ReaderBlock.guards.TimelapseReel(block)
              ? reelBlock([...timelapses, pending])
              : block
          ),
        }),
        expect(first(all.selector("video"))).toHaveAttr(
          "src",
          timelapseVideoUrl(playback.id)
        ),
        expect(first(all.selector("video"))).toHaveAttr(
          "aria-label",
          `${newest.title} timelapse`
        ),
        expect(first(tile)).toContainText(pending.title),
        expect(first(tile)).toContainText(timelapseReelText.printingNote)
      );
    }).pipe(Effect.provide(NodeServices.layer)),
  { timeout: 60_000 }
);

it("the reel autoplays only once the reader is known not to prefer reduced motion", () => {
  const model = modelWithReel(timelapses);
  const video = selector("video");

  scene(
    { update, view },
    given(model),
    expect(video).toHaveAttr("controls"),
    expect(video).toHaveAttr("poster"),
    expect(video).not.toHaveAttr("autoplay"),
    Subscription.emit(Message.ChangedReducedMotion({ isReducedMotion: true })),
    Command.expectNone(),
    expect(video).not.toHaveAttr("autoplay"),
    expect(video).toHaveAttr("controls"),
    Subscription.emit(Message.ChangedReducedMotion({ isReducedMotion: false })),
    Command.expectExact(PlayTimelapseReel()),
    Command.resolve(PlayTimelapseReel, Message.FailedPlayTimelapseReel()),
    expect(video).toHaveAttr("autoplay"),
    expect(video).toHaveAttr("muted"),
    expect(video).toHaveAttr("loop"),
    expect(video).toHaveAttr("playsInline"),
    Subscription.emit(Message.ChangedReducedMotion({ isReducedMotion: true })),
    Command.expectNone(),
    expect(video).not.toHaveAttr("autoplay")
  );
});
