import { expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import * as Arbitrary from "effect/Arbitrary";

import {
  createComponentRegistry,
  renderSvxMarkdown,
} from "../scripts/component-registry.ts";
import {
  timelapseLinksComponent,
  timelapsePendingText,
  timelapsesComponent,
  timelapsesRoute,
} from "../scripts/timelapse-components.ts";
import {
  TimelapseMilestone,
  Timelapse,
  Timelapses,
  timelapseAnchor,
  timelapses,
  timelapseVideoUrl,
} from "../scripts/timelapses.ts";
import type { TimelapseEntry } from "../scripts/timelapses.ts";

const entriesArbitrary = Arbitrary.schema(
  Schema.Array(Timelapse).check(Schema.isMaxLength(6))
).pipe(
  Arbitrary.map((entries) =>
    entries.map((entry, index) => ({
      ...entry,
      id: `plate${index}`,
      title: `Plate ${index}`,
    }))
  )
);

const registryFor = (entries: readonly TimelapseEntry[]) =>
  createComponentRegistry({
    TimelapseLinks: timelapseLinksComponent(entries),
    Timelapses: timelapsesComponent(entries),
  });

const count = (text: string, needle: string) => text.split(needle).length - 1;

it.prop(
  "the page plays every uploaded timelapse and marks every other one as printing",
  { entries: entriesArbitrary },
  ({ entries }) => {
    const human = renderSvxMarkdown(
      "<Timelapses />",
      "human",
      {},
      registryFor(entries)
    );

    const agent = renderSvxMarkdown(
      "<Timelapses />",
      "agent",
      {},
      registryFor(entries)
    );

    const uploaded = entries.filter((entry) => entry.playback !== undefined);

    expect(count(human, "<video ")).toBe(uploaded.length);
    expect(count(human, timelapsePendingText)).toBe(
      entries.length - uploaded.length
    );
    expect(count(agent, timelapsePendingText)).toBe(
      entries.length - uploaded.length
    );

    for (const entry of entries) {
      expect(count(human, `id="${timelapseAnchor(entry)}"`)).toBe(1);
    }

    for (const entry of uploaded) {
      const url = timelapseVideoUrl(entry.playback?.id ?? "");

      expect(count(human, `src="${url}"`)).toBe(1);
      expect(agent).toContain(url);
    }
  }
);

it.prop(
  "a milestone page links exactly the timelapses tagged with that milestone",
  {
    entries: entriesArbitrary,
    milestone: Arbitrary.schema(TimelapseMilestone),
  },
  ({ entries, milestone }) => {
    const rendered = renderSvxMarkdown(
      `<TimelapseLinks milestone="${milestone}" />`,
      "agent",
      {},
      registryFor(entries)
    );

    const tagged = entries.filter((entry) =>
      entry.milestones.includes(milestone)
    );

    expect(rendered.trim() === "").toBe(tagged.length === 0);

    for (const entry of entries) {
      expect(
        count(rendered, `${timelapsesRoute}#${timelapseAnchor(entry)})`)
      ).toBe(tagged.includes(entry) ? 1 : 0);
    }
  }
);

it.effect("refuses a timelapse list whose ids repeat, naming the fix", () =>
  Effect.sync(() => {
    expect(() =>
      Schema.decodeUnknownSync(Timelapses)([...timelapses, ...timelapses])
    ).toThrow(/Timelapse ids repeat\. .* Fix: /u);
  })
);
