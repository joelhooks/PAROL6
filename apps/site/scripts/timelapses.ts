import { Schema } from "effect";

import { muxImageOrigin, muxStreamOrigin } from "../src/security.ts";

export const TimelapseMilestone = Schema.Literals([
  "m1-bench-it",
  "m2-one-joint",
  "m3-whole-arm",
  "m4-pick-and-place",
  "m5-touch-the-skiff",
  "m6-patch-a-cable",
  "m7-play-it",
]);

export const Timelapse = Schema.Struct({
  id: Schema.String.check(Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)),
  layers: Schema.Int.check(Schema.isGreaterThan(0)),
  material: Schema.String,
  milestones: Schema.Array(TimelapseMilestone),
  note: Schema.optional(Schema.String),
  parts: Schema.Struct({
    files: Schema.Array(Schema.String),
    role: Schema.String,
  }),
  playback: Schema.optional(
    Schema.Struct({
      id: Schema.String.check(Schema.isPattern(/^[A-Za-z0-9]+$/u)),
      posterSeconds: Schema.Number.check(Schema.isGreaterThanOrEqualTo(0)),
    })
  ),
  printTime: Schema.String,
  title: Schema.String,
});

export type TimelapseEntry = typeof Timelapse.Type;

export const Timelapses = Schema.Array(Timelapse).check(
  Schema.makeFilter(
    (entries) =>
      new Set(entries.map((entry) => entry.id)).size === entries.length ||
      "Timelapse ids repeat. Each id is a page anchor. Fix: give the new entry in `apps/site/scripts/timelapses.ts` its own `id`."
  )
);

export const timelapses: readonly TimelapseEntry[] = Schema.decodeUnknownSync(
  Timelapses
)([
  {
    id: "test-print",
    layers: 219,
    material: "Orange PETG HF",
    milestones: [],
    parts: { files: [], role: "none, printed before any PAROL6 parts" },
    playback: {
      id: "fM5TQin8YXc97zMP97dbtYuQgTg4UuMaYvEVnf02bm00w",
      posterSeconds: 34,
    },
    printTime: "41 min",
    title: "Test print",
  },
  {
    id: "plate0-wrist-estop",
    layers: 405,
    material: "Orange PETG HF, 40% infill, tree supports",
    milestones: ["m1-bench-it", "m2-one-joint"],
    note: "The first attempt stopped at bed levelling because of a PETG clump on the nozzle. The retry ran clean.",
    parts: {
      files: ["WRIST/wrist", "ESTOP/ESTOP_BOTTOM", "ESTOP/ESTOP_TOP"],
      role: "the M2 wrist part and the M1 E-stop box",
    },
    playback: {
      id: "4PjMu43fI1m6ilwcDuNhux51tH01yngp8OVMRjYXxjLg",
      posterSeconds: 66,
    },
    printTime: "about 3.5 h",
    title: "Plate 0: wrist and E-stop box",
  },
  {
    id: "plate1-forearm-j5",
    layers: 498,
    material: "Orange PETG HF, 30% infill, tree supports",
    milestones: ["m3-whole-arm"],
    parts: {
      files: ["FOREARM/J5_part", "J5_belt_lid", "J5_electronics_lid"],
      role: "the first M3 forearm parts",
    },
    playback: {
      id: "F3BAdoGsjOohnz8VzE00Wt0001Obhv81qxzoOu6SVINJQ4",
      posterSeconds: 84,
    },
    printTime: "about 4 h 40 min",
    title: "Plate 1: J5 forearm part and lids",
  },
  {
    id: "plate3-pulleys",
    layers: 302,
    material: "Orange PETG HF, 70% infill",
    milestones: ["m3-whole-arm"],
    parts: {
      files: [
        "UPPER_ARM/42_pulley",
        "FOREARM/HTD3_48_J5_pulley",
        "FOREARM/J4_output_pulley",
      ],
      role: "pulleys; the 42 pulley is a belt-fit test",
    },
    printTime: "about 2 h 54 min (estimate)",
    title: "Plate 3: pulleys",
  },
]);

export const timelapseAnchor = (timelapse: TimelapseEntry) =>
  `timelapse-${timelapse.id}`;

export const timelapseVideoUrl = (playbackId: string) =>
  `${muxStreamOrigin}/${playbackId}/highest.mp4`;

export const timelapsePosterUrl = (playbackId: string, seconds: number) =>
  `${muxImageOrigin}/${playbackId}/thumbnail.jpg?time=${seconds}`;
