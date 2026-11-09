import { Data, Schema } from "effect";
import { defineTaggedUnion } from "foldkit/schema";

export type ReaderInlineValue = Data.TaggedEnum<{
  Code: { readonly value: string };
  Emphasis: { readonly content: readonly ReaderInlineValue[] };
  Link: { readonly href: string; readonly value: string };
  Strong: { readonly content: readonly ReaderInlineValue[] };
  Text: { readonly value: string };
}>;

export const ReaderInline = Data.taggedEnum<ReaderInlineValue>();

export const ReaderInlineSchema: Schema.Codec<ReaderInlineValue> =
  Schema.suspend(() =>
    Schema.Union([
      Schema.TaggedStruct("Code", { value: Schema.String }),
      Schema.TaggedStruct("Emphasis", {
        content: Schema.Array(ReaderInlineSchema),
      }),
      Schema.TaggedStruct("Link", {
        href: Schema.String,
        value: Schema.String,
      }),
      Schema.TaggedStruct("Strong", {
        content: Schema.Array(ReaderInlineSchema),
      }),
      Schema.TaggedStruct("Text", { value: Schema.String }),
    ])
  );

export const TimelapseReelParts = Schema.Struct({
  files: Schema.Array(Schema.String),
  role: Schema.String,
});

export const TimelapseReelLatest = Schema.Struct({
  href: Schema.String,
  parts: TimelapseReelParts,
  posterUrl: Schema.String,
  printTime: Schema.String,
  title: Schema.String,
  videoUrl: Schema.String,
});

export const TimelapseReelTile = defineTaggedUnion({
  Printed: {
    href: Schema.String,
    parts: TimelapseReelParts,
    posterUrl: Schema.String,
    printTime: Schema.String,
    title: Schema.String,
  },
  Printing: {
    href: Schema.String,
    parts: TimelapseReelParts,
    printTime: Schema.String,
    title: Schema.String,
  },
});

export const ReaderBlock = defineTaggedUnion({
  CodeFence: {
    language: Schema.String,
    meta: Schema.String,
    value: Schema.String,
  },
  CopyPrompt: { id: Schema.String },
  Diagram: { alt: Schema.String, value: Schema.String },
  Heading: {
    id: Schema.String,
    level: Schema.optional(Schema.Literals([2, 3, 4])),
    title: Schema.String,
  },
  List: { items: Schema.Array(Schema.Array(ReaderInlineSchema)) },
  Paragraph: { content: Schema.Array(ReaderInlineSchema) },
  PromptText: { value: Schema.String },
  Snippet: {
    at: Schema.String,
    lines: Schema.String,
    path: Schema.String,
    repo: Schema.String,
  },
  TimelapseReel: {
    allHref: Schema.String,
    latest: Schema.OptionFromOptional(TimelapseReelLatest),
    tiles: Schema.Array(TimelapseReelTile),
  },
});

export type ReaderBlockValue = typeof ReaderBlock.Type;
