import * as Cloudflare from "@alchemy.run/cloudflare";
import { expect, it } from "@effect/vitest";

import { parol6State } from "../src/state-store.js";

it("asks Alchemy for the PAROL6 state-store Worker, never RatStack's", () => {
  const requested: Parameters<typeof Cloudflare.state>[0][] = [];

  parol6State((options) => {
    requested.push(options);

    return Cloudflare.state(options);
  });

  expect(requested).toEqual([
    { workerName: "alchemy-state-store-parol6-state-store" },
  ]);
});
