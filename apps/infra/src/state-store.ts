import * as Cloudflare from "@alchemy.run/cloudflare";

export const parol6StateStoreName = "alchemy-state-store-parol6-state-store";

export const parol6State = (state = Cloudflare.state) =>
  state({ workerName: parol6StateStoreName });
