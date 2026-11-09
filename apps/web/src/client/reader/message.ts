import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

import { Message as CafeMessage } from "../cafe/message.js";
import { Message as DocsMessage } from "../docs/message.js";
import { Message as MotionDemoMessage } from "../motion/message.js";
import { DetectedClipboardAccess } from "./model.js";

export const Message = defineMessageUnion({
  ChangedReducedMotion: { isReducedMotion: Schema.Boolean },
  ClickedCopy: { id: Schema.String },
  CompletedDetectClipboard: { access: DetectedClipboardAccess },
  CompletedOpenSiteSearch: {},
  CompletedWaitBeforeCopyReset: { id: Schema.String },
  FailedCopyReaderText: { id: Schema.String },
  FailedPlayTimelapseReel: {},
  GotCafeMessage: { message: CafeMessage },
  GotDocsMessage: { message: DocsMessage },
  GotMotionMessage: { message: MotionDemoMessage },
  SubmittedSiteSearch: {},
  SucceededCopyReaderText: { id: Schema.String },
  SucceededPlayTimelapseReel: {},
  UpdatedSiteSearch: { value: Schema.String },
});

export type ReaderMessage = typeof Message.Type;
