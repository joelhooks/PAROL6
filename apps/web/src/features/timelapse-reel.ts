import { Option } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { TimelapseReelTile } from "../client/reader-document.js";
import type {
  ReaderBlockValue,
  TimelapseReelLatest,
  TimelapseReelParts,
} from "../client/reader-document.js";
import {
  MotionPreference,
  timelapseReelVideoId,
} from "../client/reader/model.js";

export type TimelapseReelBlock = Extract<
  ReaderBlockValue,
  { readonly _tag: "TimelapseReel" }
>;

export const timelapseReelText = {
  all: "All print timelapses",
  earlier: "Earlier plate",
  latest: "Latest plate",
  printing: "Printing now",
  printingNote: "Printing, timelapse coming.",
} as const;

const partsLine = <Message>(
  parts: typeof TimelapseReelParts.Type,
  h: HtmlBuilder<Message>
): readonly (Html | string)[] =>
  parts.files.length === 0
    ? [`Parts: ${parts.role}.`]
    : [
        "Parts: ",
        ...parts.files.flatMap((file, index) => [
          ...(index === 0 ? [] : [", "]),
          h.code([], [file]),
        ]),
        ".",
      ];

const facts = <Message>(
  entry: {
    readonly parts: typeof TimelapseReelParts.Type;
    readonly printTime: string;
  },
  h: HtmlBuilder<Message>
): readonly Html[] => [
  h.p([h.Class("timelapse-reel-fact")], partsLine(entry.parts, h)),
  h.p([h.Class("timelapse-reel-fact")], [`Print time: ${entry.printTime}.`]),
];

const latestView = <Message>(
  latest: typeof TimelapseReelLatest.Type,
  motionPreference: typeof MotionPreference.Type,
  h: HtmlBuilder<Message>
): Html =>
  h.figure(
    [h.Class("timelapse-reel-latest")],
    [
      h.video([
        h.Id(timelapseReelVideoId),
        h.Class("timelapse-reel-video"),
        h.Src(latest.videoUrl),
        h.Poster(latest.posterUrl),
        h.Preload("metadata"),
        h.Controls(true),
        h.Muted(true),
        h.Loop(true),
        h.Playsinline(true),
        ...(MotionPreference.guards.NoPreference(motionPreference)
          ? [h.Autoplay(true)]
          : []),
        h.AriaLabel(`${latest.title} timelapse`),
      ]),
      h.figcaption(
        [],
        [
          h.p(
            [h.Class("timelapse-reel-title")],
            [
              h.span(
                [h.Class("timelapse-reel-label")],
                [timelapseReelText.latest]
              ),
              h.a([h.Href(latest.href)], [latest.title]),
            ]
          ),
          ...facts(latest, h),
        ]
      ),
    ]
  );

const tileView = <Message>(
  tile: typeof TimelapseReelTile.Type,
  h: HtmlBuilder<Message>
): Html =>
  h.li(
    [h.Key(tile.href), h.Class("timelapse-tile")],
    [
      h.a(
        [h.Href(tile.href), h.Class("timelapse-tile-link")],
        [
          TimelapseReelTile.match<Html>(tile, {
            Printed: ({ posterUrl }) =>
              h.img([
                h.Class("timelapse-tile-poster"),
                h.Src(posterUrl),
                h.Alt(""),
                h.Loading("lazy"),
                h.Decoding("async"),
              ]),
            Printing: () =>
              h.span(
                [h.Class("timelapse-tile-poster timelapse-tile-printing")],
                [timelapseReelText.printingNote]
              ),
          }),
          h.span(
            [h.Class("timelapse-reel-label")],
            [
              TimelapseReelTile.guards.Printing(tile)
                ? timelapseReelText.printing
                : timelapseReelText.earlier,
            ]
          ),
          h.strong([], [tile.title]),
        ]
      ),
      ...facts(tile, h),
    ]
  );

export const timelapseReelView = <Message>(
  reel: TimelapseReelBlock,
  motionPreference: typeof MotionPreference.Type,
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [h.Class("timelapse-reel")],
    [
      ...Option.match(reel.latest, {
        onNone: () => [],
        onSome: (latest) => [latestView(latest, motionPreference, h)],
      }),
      ...(reel.tiles.length === 0
        ? []
        : [
            h.ul(
              [h.Class("timelapse-reel-tiles")],
              reel.tiles.map((tile) => tileView(tile, h))
            ),
          ]),
      h.p(
        [h.Class("timelapse-reel-all")],
        [h.a([h.Href(reel.allHref)], [timelapseReelText.all])]
      ),
    ]
  );
