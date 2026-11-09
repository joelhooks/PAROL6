import { Effect, Schema } from "effect";
import { Command } from "foldkit";
import { load } from "foldkit/navigation";

import { Message } from "./message.js";
import { ClipboardAccess, timelapseReelVideoId } from "./model.js";

class ClipboardFailure extends Schema.TaggedError<
  ClipboardFailure,
  { readonly brand: unique symbol }
>()("ClipboardFailure", { cause: Schema.Unknown }) {}

const playVideo = (element: Element | null) =>
  element instanceof HTMLVideoElement
    ? element.play()
    : Promise.reject(
        new Error(
          `No video #${timelapseReelVideoId} on this page. The reel renders it from the TimelapseReel block. Fix: render the block before playing it.`
        )
      );

export const DetectClipboard = Command.define("DetectClipboard", {
  execute: Effect.sync(() =>
    Message.CompletedDetectClipboard({
      access:
        navigator.clipboard === undefined
          ? ClipboardAccess.Unavailable()
          : ClipboardAccess.Available(),
    })
  ),
  messages: [Message.CompletedDetectClipboard],
});

export const CopyReaderText = Command.define("CopyReaderText", {
  args: { id: Schema.String, text: Schema.String },
  execute: ({ id, text }) =>
    Effect.tryPromise({
      catch: (cause) => new ClipboardFailure({ cause }),
      try: () => navigator.clipboard.writeText(text),
    }).pipe(
      Effect.match({
        onFailure: () => Message.FailedCopyReaderText({ id }),
        onSuccess: () => Message.SucceededCopyReaderText({ id }),
      })
    ),
  messages: [Message.FailedCopyReaderText, Message.SucceededCopyReaderText],
});

export const WaitBeforeCopyReset = Command.define("WaitBeforeCopyReset", {
  args: { id: Schema.String },
  execute: ({ id }) =>
    Effect.sleep("2 seconds").pipe(
      Effect.as(Message.CompletedWaitBeforeCopyReset({ id }))
    ),
  messages: [Message.CompletedWaitBeforeCopyReset],
});

export const PlayTimelapseReel = Command.define("PlayTimelapseReel", {
  execute: Effect.tryPromise(() =>
    playVideo(document.querySelector(`#${timelapseReelVideoId}`))
  ).pipe(
    Effect.match({
      onFailure: () => Message.FailedPlayTimelapseReel(),
      onSuccess: () => Message.SucceededPlayTimelapseReel(),
    })
  ),
  messages: [
    Message.FailedPlayTimelapseReel,
    Message.SucceededPlayTimelapseReel,
  ],
});

export const OpenSiteSearch = Command.define("OpenSiteSearch", {
  args: { url: Schema.String },
  execute: ({ url }) =>
    load(url).pipe(Effect.as(Message.CompletedOpenSiteSearch())),
  messages: [Message.CompletedOpenSiteSearch],
});
