import { Array, Data, Option, Schema } from "effect";
import type { ListItem, PhrasingContent, RootContent } from "mdast";

import { wikiSections } from "../../web/src/features/wiki-nav.ts";
import type {
  ComponentDefinition,
  ComponentInput,
  ComponentTarget,
} from "./component-registry.ts";
import {
  TimelapseMilestone,
  timelapseAnchor,
  timelapsePosterUrl,
  timelapseVideoUrl,
} from "./timelapses.ts";
import type { TimelapseEntry } from "./timelapses.ts";

export const timelapsesRoute = "/lore/timelapses";

export const timelapsePendingText = "Printing, timelapse coming.";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const html = (value: string): RootContent => ({ type: "html", value });

const text = (value: string): PhrasingContent => ({ type: "text", value });

const link = (url: string, label: string): PhrasingContent => ({
  children: [text(label)],
  type: "link",
  url,
});

const milestoneHref = (milestone: typeof TimelapseMilestone.Type) =>
  `/lore/${milestone}`;

const milestoneLabel = (milestone: typeof TimelapseMilestone.Type) =>
  Option.getOrElse(
    Array.findFirst(
      wikiSections.flatMap((section) => section.links),
      (entry) => entry.href === milestoneHref(milestone)
    ).pipe(Option.map((entry) => entry.label)),
    () => milestone
  );

const fact = (label: string, value: readonly PhrasingContent[]): ListItem => ({
  children: [
    {
      children: [{ children: [text(label)], type: "strong" }, ...value],
      type: "paragraph",
    },
  ],
  spread: false,
  type: "listItem",
});

const partsValue = (timelapse: TimelapseEntry): readonly PhrasingContent[] =>
  timelapse.parts.files.length === 0
    ? [text(` ${timelapse.parts.role}.`)]
    : [
        text(" "),
        ...timelapse.parts.files.flatMap(
          (file, index): readonly PhrasingContent[] => [
            ...(index === 0 ? [] : [text(", ")]),
            { type: "inlineCode", value: file },
          ]
        ),
        text(` (${timelapse.parts.role}).`),
      ];

const milestonesValue = (
  timelapse: TimelapseEntry
): readonly PhrasingContent[] =>
  timelapse.milestones.length === 0
    ? [text(" none.")]
    : [
        text(" "),
        ...timelapse.milestones.flatMap(
          (milestone, index): readonly PhrasingContent[] => [
            ...(index === 0 ? [] : [text(", ")]),
            link(milestoneHref(milestone), milestoneLabel(milestone)),
          ]
        ),
        text("."),
      ];

const facts = (timelapse: TimelapseEntry): RootContent => ({
  children: [
    fact("Parts:", partsValue(timelapse)),
    fact("Material:", [text(` ${timelapse.material}.`)]),
    fact("Layers:", [text(` ${timelapse.layers}.`)]),
    fact("Print time:", [text(` ${timelapse.printTime}.`)]),
    fact("Milestones:", milestonesValue(timelapse)),
    ...(timelapse.note === undefined
      ? []
      : [fact("Note:", [text(` ${timelapse.note}`)])]),
  ],
  ordered: false,
  spread: false,
  type: "list",
});

const videoHtml = (timelapse: TimelapseEntry) =>
  timelapse.playback === undefined
    ? `<p class="timelapse-pending">${timelapsePendingText}</p>`
    : `<video class="timelapse-video" controls playsinline muted loop preload="metadata" poster="${escapeHtml(timelapsePosterUrl(timelapse.playback.id, timelapse.playback.posterSeconds))}" src="${escapeHtml(timelapseVideoUrl(timelapse.playback.id))}" aria-label="${escapeHtml(`${timelapse.title} timelapse`)}"></video>`;

const videoAgent = (timelapse: TimelapseEntry): RootContent => ({
  children:
    timelapse.playback === undefined
      ? [text(timelapsePendingText)]
      : [
          link(
            timelapseVideoUrl(timelapse.playback.id),
            "Watch the timelapse (MP4)"
          ),
          text("."),
        ],
  type: "paragraph",
});

const heading = (timelapse: TimelapseEntry): RootContent => ({
  children: [text(timelapse.title)],
  depth: 2,
  type: "heading",
});

export const renderTimelapse = (
  timelapse: TimelapseEntry,
  target: ComponentTarget
): readonly RootContent[] =>
  target === "agent"
    ? [heading(timelapse), videoAgent(timelapse), facts(timelapse)]
    : [
        html(
          `<section class="timelapse" id="${escapeHtml(timelapseAnchor(timelapse))}">`
        ),
        heading(timelapse),
        html(videoHtml(timelapse)),
        facts(timelapse),
        html("</section>"),
      ];

export const timelapsesComponent = (
  entries: readonly TimelapseEntry[]
): ComponentDefinition => ({
  agent: () => entries.flatMap((entry) => renderTimelapse(entry, "agent")),
  human: () => entries.flatMap((entry) => renderTimelapse(entry, "human")),
});

const milestoneFor = (input: ComponentInput) =>
  Schema.decodeUnknownSync(Schema.Struct({ milestone: TimelapseMilestone }))(
    input.attributes
  ).milestone;

export const timelapseLinks = (
  entries: readonly TimelapseEntry[],
  milestone: typeof TimelapseMilestone.Type
): readonly RootContent[] => {
  const matching = entries.filter((entry) =>
    entry.milestones.includes(milestone)
  );

  return matching.length === 0
    ? []
    : [
        {
          children: [
            link(timelapsesRoute, "Print timelapses"),
            text(": "),
            ...matching.flatMap((entry, index): readonly PhrasingContent[] => [
              ...(index === 0 ? [] : [text(", ")]),
              link(`${timelapsesRoute}#${timelapseAnchor(entry)}`, entry.title),
              ...(entry.playback === undefined
                ? [text(" (printing, timelapse coming)")]
                : []),
            ]),
            text("."),
          ],
          type: "paragraph",
        },
      ];
};

export const timelapseLinksComponent = (
  entries: readonly TimelapseEntry[]
): ComponentDefinition => ({
  agent: (input) => timelapseLinks(entries, milestoneFor(input)),
  human: (input) => timelapseLinks(entries, milestoneFor(input)),
});

export const timelapseReelEarlierLimit = 3;

export interface TimelapseReelParts {
  readonly files: readonly string[];
  readonly role: string;
}

export interface TimelapseReelLatest {
  readonly href: string;
  readonly parts: TimelapseReelParts;
  readonly posterUrl: string;
  readonly printTime: string;
  readonly title: string;
  readonly videoUrl: string;
}

export type TimelapseReelTile = Data.TaggedEnum<{
  Printed: {
    readonly href: string;
    readonly parts: TimelapseReelParts;
    readonly posterUrl: string;
    readonly printTime: string;
    readonly title: string;
  };
  Printing: {
    readonly href: string;
    readonly parts: TimelapseReelParts;
    readonly printTime: string;
    readonly title: string;
  };
}>;

export const ReelTile = Data.taggedEnum<TimelapseReelTile>();

export interface TimelapseReel {
  readonly allHref: string;
  readonly latest?: TimelapseReelLatest;
  readonly tiles: readonly TimelapseReelTile[];
}

export const timelapseHref = (timelapse: TimelapseEntry) =>
  `${timelapsesRoute}#${timelapseAnchor(timelapse)}`;

const reelParts = (timelapse: TimelapseEntry): TimelapseReelParts => ({
  files: timelapse.parts.files,
  role: timelapse.parts.role,
});

export const timelapseReel = (
  entriesInPrintOrder: readonly TimelapseEntry[]
): TimelapseReel => {
  const newestFirst = entriesInPrintOrder.toReversed();

  const printed = newestFirst.flatMap((timelapse) =>
    timelapse.playback === undefined
      ? []
      : [{ playback: timelapse.playback, timelapse }]
  );

  const [latest, ...earlier] = printed;

  const printing = newestFirst.flatMap((timelapse): TimelapseReelTile[] =>
    timelapse.playback === undefined
      ? [
          ReelTile.Printing({
            href: timelapseHref(timelapse),
            parts: reelParts(timelapse),
            printTime: timelapse.printTime,
            title: timelapse.title,
          }),
        ]
      : []
  );

  const earlierTiles = earlier
    .slice(0, timelapseReelEarlierLimit)
    .map(({ playback, timelapse }) =>
      ReelTile.Printed({
        href: timelapseHref(timelapse),
        parts: reelParts(timelapse),
        posterUrl: timelapsePosterUrl(playback.id, playback.posterSeconds),
        printTime: timelapse.printTime,
        title: timelapse.title,
      })
    );

  const reel = {
    allHref: timelapsesRoute,
    tiles: [...printing, ...earlierTiles],
  };

  return latest === undefined
    ? reel
    : {
        ...reel,
        latest: {
          href: timelapseHref(latest.timelapse),
          parts: reelParts(latest.timelapse),
          posterUrl: timelapsePosterUrl(
            latest.playback.id,
            latest.playback.posterSeconds
          ),
          printTime: latest.timelapse.printTime,
          title: latest.timelapse.title,
          videoUrl: timelapseVideoUrl(latest.playback.id),
        },
      };
};

export const timelapseReelLabels = {
  all: "All print timelapses",
  earlier: "Earlier plate:",
  latest: "Latest plate:",
  printing: "Printing now:",
} as const;

const reelPartsValue = (
  parts: TimelapseReelParts
): readonly PhrasingContent[] =>
  parts.files.length === 0
    ? [text(` ${parts.role}.`)]
    : [
        text(" "),
        ...parts.files.flatMap((file, index): readonly PhrasingContent[] => [
          ...(index === 0 ? [] : [text(", ")]),
          { type: "inlineCode", value: file },
        ]),
        text("."),
      ];

const reelItem = (
  label: string,
  entry: {
    readonly href: string;
    readonly parts: TimelapseReelParts;
    readonly printTime: string;
    readonly title: string;
  },
  extra: readonly PhrasingContent[]
): ListItem => ({
  children: [
    {
      children: [
        { children: [text(label)], type: "strong" },
        text(" "),
        link(entry.href, entry.title),
        text(". Parts:"),
        ...reelPartsValue(entry.parts),
        text(` Print time: ${entry.printTime}.`),
        ...extra,
      ],
      type: "paragraph",
    },
  ],
  spread: false,
  type: "listItem",
});

export const renderTimelapseReel = (
  reel: TimelapseReel
): readonly RootContent[] => [
  {
    children: [
      ...reel.tiles.flatMap((tile) =>
        ReelTile.$is("Printing")(tile)
          ? [
              reelItem(timelapseReelLabels.printing, tile, [
                text(` ${timelapsePendingText}`),
              ]),
            ]
          : []
      ),
      ...(reel.latest === undefined
        ? []
        : [
            reelItem(timelapseReelLabels.latest, reel.latest, [
              text(" "),
              link(reel.latest.videoUrl, "Watch the timelapse (MP4)"),
              text("."),
            ]),
          ]),
      ...reel.tiles.flatMap((tile) =>
        ReelTile.$is("Printed")(tile)
          ? [reelItem(timelapseReelLabels.earlier, tile, [])]
          : []
      ),
    ],
    ordered: false,
    spread: false,
    type: "list",
  },
  {
    children: [link(reel.allHref, timelapseReelLabels.all), text(".")],
    type: "paragraph",
  },
];

export const timelapseReelComponent = (
  entries: readonly TimelapseEntry[]
): ComponentDefinition => ({
  agent: () => renderTimelapseReel(timelapseReel(entries)),
  human: () => renderTimelapseReel(timelapseReel(entries)),
});
