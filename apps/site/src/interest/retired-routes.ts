import { Effect, Layer } from "effect";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServerResponse from "effect/http/HttpServerResponse";

const retiredApplication = HttpServerResponse.jsonUnsafe(
  {
    detail:
      "Applications go through your agent. Read the workshop page and apply through joinInterest with a fresh page ticket.",
    next: {
      capability: "joinInterest",
      href: "https://parol6.build/tokenmaxx#interested",
    },
    status: 410,
    title: "Applications go through your agent",
    type: "https://parol6.build/tokenmaxx#interested",
  },
  {
    contentType: "application/problem+json",
    headers: { "cache-control": "no-store" },
    status: 410,
  }
);

export const retiredInterestRoutes = Layer.mergeAll(
  HttpRouter.add(
    "POST",
    "/tokenmaxx/interest",
    Effect.succeed(retiredApplication)
  ),
  HttpRouter.add(
    "POST",
    "/api/registerInterest",
    Effect.succeed(retiredApplication)
  )
);
