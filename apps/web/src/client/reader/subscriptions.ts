import { REDUCED_MOTION_QUERY } from "@rat-stack/motion/foldkit";
import { Schema, Stream } from "effect";
import { Dom, Subscription } from "foldkit";

import * as MotionDemo from "../motion/index.js";
import { Message } from "./message.js";
import type { ReaderMessage } from "./message.js";
import { hasTimelapseReel } from "./model.js";
import type { ReaderModel } from "./model.js";

const motionDemoSubscriptions = Subscription.lift(MotionDemo.subscriptions)<
  ReaderModel,
  ReaderMessage
>({
  read: (model) => model.motion,
  toParentMessage: (message) => Message.GotMotionMessage({ message }),
});

const timelapseReelSubscriptions = Subscription.make<
  ReaderModel,
  ReaderMessage
>()((entry) => ({
  timelapseReelMotion: entry(
    { isReelOnPage: Schema.Boolean },
    {
      dependenciesToStream: ({ isReelOnPage }) =>
        isReelOnPage
          ? Dom.streamFromMediaQuery({
              mapMatches: (isReducedMotion) =>
                Message.ChangedReducedMotion({ isReducedMotion }),
              query: REDUCED_MOTION_QUERY,
            })
          : Stream.empty,
      modelToDependencies: (model) => ({
        isReelOnPage: hasTimelapseReel(model),
      }),
    }
  ),
}));

export const subscriptions = Subscription.aggregate(
  motionDemoSubscriptions,
  timelapseReelSubscriptions
);
