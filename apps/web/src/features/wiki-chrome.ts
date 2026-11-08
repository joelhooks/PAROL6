import * as stylex from "@stylexjs/stylex";
import { Array, Option, pipe } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { ReaderNode } from "../client/reader-node.js";
import type { ReaderNodeValue } from "../client/reader-node.js";
import { wikiHome, wikiSections, wikiTrailFor } from "./wiki-nav.js";
import type { WikiSection } from "./wiki-nav.js";
import { wikiStyles } from "./wiki.stylex.js";

const className = (...styles: readonly stylex.StyleXStyles[]) =>
  stylex.props(...styles).className ?? "";

export interface TocEntry {
  readonly depth: 2 | 3;
  readonly id: string;
  readonly title: string;
}

const textOf = (node: ReaderNodeValue): string =>
  ReaderNode.$match(node, {
    CopyPrompt: () => "",
    Element: ({ children }) => children.map(textOf).join(""),
    Text: ({ value }) => value,
  });

const attributeOf = (node: ReaderNodeValue, name: string) =>
  ReaderNode.$is("Element")(node)
    ? Array.findFirst(node.attributes, (attribute) => attribute.name === name)
    : Option.none();

export const tocEntries = (
  nodes: readonly ReaderNodeValue[]
): readonly TocEntry[] =>
  nodes.flatMap((node): readonly TocEntry[] => {
    if (!ReaderNode.$is("Element")(node)) {
      return [];
    }

    if (node.tag === "h2" || node.tag === "h3") {
      const depth = node.tag === "h2" ? 2 : 3;

      return Option.match(attributeOf(node, "id"), {
        onNone: () => [],
        onSome: ({ value }) => [
          { depth, id: value, title: textOf(node).trim() },
        ],
      });
    }

    return tocEntries(node.children);
  });

const tocList = <Message>(
  entries: readonly TocEntry[],
  h: HtmlBuilder<Message>
) => {
  const groups: {
    readonly entry: TocEntry;
    readonly children: TocEntry[];
  }[] = [];

  for (const entry of entries) {
    const last = groups.at(-1);

    if (entry.depth === 3 && last !== undefined) {
      last.children.push(entry);
    } else {
      groups.push({ children: [], entry });
    }
  }

  return h.ol(
    [h.Class(className(wikiStyles.tocList))],
    groups.map(({ entry, children }) =>
      h.li(
        [h.Key(entry.id)],
        [
          h.a([h.Href(`#${entry.id}`)], [entry.title]),
          ...(children.length === 0
            ? []
            : [
                h.ol(
                  [h.Class(className(wikiStyles.tocSub))],
                  children.map((child) =>
                    h.li(
                      [h.Key(child.id)],
                      [h.a([h.Href(`#${child.id}`)], [child.title])]
                    )
                  )
                ),
              ]),
        ]
      )
    )
  );
};

const hasToc = (entries: readonly TocEntry[]) => entries.length >= 3;

const sectionView = <Message>(
  section: WikiSection,
  path: string,
  h: HtmlBuilder<Message>
) =>
  h.section(
    [h.Key(section.title)],
    [
      h.h2([h.Class(className(wikiStyles.sectionTitle))], [section.title]),
      h.ul(
        [h.Class(className(wikiStyles.list))],
        section.links.map((link) =>
          h.li(
            [h.Key(link.href)],
            [
              h.a(
                [
                  h.Href(link.href),
                  h.Class(
                    link.href === path
                      ? className(wikiStyles.link, wikiStyles.current)
                      : className(wikiStyles.link)
                  ),
                  ...(link.href === path ? [h.AriaCurrent("page")] : []),
                ],
                [link.label]
              ),
            ]
          )
        )
      ),
    ]
  );

const wikiTree = <Message>(path: string, h: HtmlBuilder<Message>) =>
  wikiSections.map((section) => sectionView(section, path, h));

export const wikiSidebar = <Message>(
  path: string,
  toc: readonly TocEntry[],
  h: HtmlBuilder<Message>
) =>
  h.aside(
    [h.Class(className(wikiStyles.sidebar))],
    [
      ...(hasToc(toc)
        ? [
            h.nav(
              [
                h.AriaLabel("On this page"),
                h.Class(className(wikiStyles.sidebarToc)),
              ],
              [
                h.h2(
                  [h.Class(className(wikiStyles.sectionTitle))],
                  ["On this page"]
                ),
                tocList(toc, h),
              ]
            ),
          ]
        : []),
      h.nav([h.AriaLabel("Wiki")], wikiTree(path, h)),
    ]
  );

export const wikiMobileNav = <Message>(
  path: string,
  toc: readonly TocEntry[],
  h: HtmlBuilder<Message>
) =>
  h.div(
    [h.Class(className(wikiStyles.mobileBar))],
    [
      h.details(
        [h.Class(className(wikiStyles.mobileNav))],
        [
          h.summary(
            [h.Class(className(wikiStyles.summary))],
            ["Wiki contents"]
          ),
          h.nav([h.AriaLabel("Wiki contents")], wikiTree(path, h)),
        ]
      ),
      ...(hasToc(toc)
        ? [
            h.details(
              [h.Class(className(wikiStyles.mobileNav))],
              [
                h.summary(
                  [h.Class(className(wikiStyles.summary))],
                  ["On this page"]
                ),
                h.nav([h.AriaLabel("On this page")], [tocList(toc, h)]),
              ]
            ),
          ]
        : []),
    ]
  );

export const wikiBreadcrumb = <Message>(
  path: string,
  heading: string,
  h: HtmlBuilder<Message>
): Option.Option<Html> =>
  pipe(
    wikiTrailFor(path),
    Option.filter(() => path.startsWith("/lore/")),
    Option.map(({ section }) =>
      h.nav(
        [h.AriaLabel("Breadcrumb"), h.Class("breadcrumb")],
        [
          h.a([h.Href(wikiHome.href)], [wikiHome.label]),
          " / ",
          ...(section.href === path
            ? []
            : [h.a([h.Href(section.href)], [section.title]), " / "]),
          heading,
        ]
      )
    )
  );

export const wikiBrand = <Message>(href: string, h: HtmlBuilder<Message>) =>
  h.a(
    [h.Href(href), h.Class(className(wikiStyles.brand))],
    ["🦾 PAROL6 build wiki"]
  );
