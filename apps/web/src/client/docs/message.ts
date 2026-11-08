import { ReadOutput } from "@rat-stack/core/contracts";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";
import { UrlRequest } from "foldkit/navigation";
import { Url } from "foldkit/url";

export const Message = defineMessageUnion({
  ChangedUrl: { url: Url },
  ClickedLink: { request: UrlRequest },
  CompletedLoadExternal: {},
  CompletedNavigate: {},
  FailedRead: {
    generation: Schema.Finite,
    message: Schema.String,
    notFound: Schema.Boolean,
  },
  SubmittedSearch: {},
  SucceededRead: { document: ReadOutput, generation: Schema.Finite },
  UpdatedQuery: { value: Schema.String },
});

export type AppMessage = typeof Message.Type;
