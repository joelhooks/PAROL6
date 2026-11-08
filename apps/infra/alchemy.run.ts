import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Drizzle from "@alchemy.run/drizzle/Providers";
import { turboCache } from "@rat-stack/turbo-cache";
import * as Alchemy from "alchemy";
import { adopt } from "alchemy/AdoptPolicy";
import { retain } from "alchemy/RemovalPolicy";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import privateAuth from "../site/src/auth/private-worker.js";
import Mischief from "../site/src/worker.js";
import { Website } from "../web/src/website.js";
import { parol6State } from "./src/state-store.js";

export default Alchemy.Stack(
  "PAROL6",
  {
    providers: Layer.mergeAll(Cloudflare.providers(), Drizzle.providers()),
    state: parol6State(),
  },
  Effect.gen(function* stack() {
    const dev = yield* Alchemy.ALCHEMY_DEV;

    if (!dev) {
      const zone = yield* Cloudflare.Zone.Zone("Parol6Zone", {
        name: "parol6.build",
      }).pipe(
        adopt(true),
        // oxlint-disable-next-line rat-stack-patterns/retain-needs-stage-policy -- Every main Stack stage adopts the same production zone; deleting it destroys shared DNS.
        retain()
      );

      yield* Cloudflare.DNS.Dnssec("Parol6Dnssec", {
        status: "active",
        zoneId: zone.zoneId,
      }).pipe(
        adopt(true),
        // oxlint-disable-next-line rat-stack-patterns/retain-needs-stage-policy -- Every main Stack stage adopts production DNSSEC; removing it breaks the shared zone's trust chain.
        retain()
      );
    }

    const website = yield* Website;

    const mischief = yield* Mischief;

    yield* turboCache;

    yield* mischief.bind`${website}`({
      bindings: [
        { name: "WEBSITE", service: website.workerName, type: "service" },
      ],
    });

    return { mischiefUrl: mischief.url, websiteUrl: website.url };
  }).pipe(
    Effect.provide(
      Layer.unwrap(
        Config.Boolean("AUTH_ENABLED").pipe(
          Config.withDefault(false),
          Effect.map((enabled) => (enabled ? privateAuth : Layer.empty))
        )
      )
    )
  )
);
