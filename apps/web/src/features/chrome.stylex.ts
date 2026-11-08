import * as stylex from "@stylexjs/stylex";

import { accent, reader } from "./tokens.stylex.js";

export const styles = stylex.create({
  brand: {
    alignItems: "center",
    borderRadius: reader.radius,
    color: "inherit",
    display: "flex",
    gap: reader.spaceSmall,
    minHeight: "42px",
    overflow: "hidden",
    padding: reader.spaceTight,
    textDecoration: "none",
  },
  focus: {
    outlineColor: { ":focus-visible": accent.accent, default: null },
    outlineOffset: { ":focus-visible": "3px", default: null },
    outlineStyle: { ":focus-visible": "solid", default: null },
    outlineWidth: { ":focus-visible": "2px", default: null },
  },
  header: {
    alignItems: "center",
    borderBottomColor: reader.rule,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    display: "flex",
    flexWrap: "wrap",
    gap: reader.spaceSmall,
    paddingBlock: reader.spaceSmall,
  },
  shell: {
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    minWidth: 0,
  },
});
