import { Button, Input } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import { Array, Option } from "effect";
import type { Document, Html, HtmlBuilder } from "foldkit/html";

import { Message } from "../client/reader/message.js";
import type { ReaderMessage } from "../client/reader/message.js";
import {
  ClipboardAccess,
  copyStatusOf,
  CopyStatus,
  findCopyPrompt,
} from "../client/reader/model.js";
import type { ReaderModel } from "../client/reader/model.js";
import { view as docsView } from "./app.js";
import * as CafeView from "./cafe/index.js";
import * as MotionView from "./motion/index.js";
import { readerFooter, readerNewsCallout } from "./reader-chrome.js";
import { readerCopyIcon } from "./reader-copy-icon.js";
import { renderReaderBlock } from "./reader-document.js";
import type { SnippetReference } from "./reader-document.js";
import { renderReaderNode } from "./reader-node.js";
import { readerReferences } from "./reader-references.js";
import { readerStyles } from "./reader.stylex.js";
import {
  agentGuideRouter,
  changeLogRouter,
  glossaryRouter,
  homeRouter,
  isWithinSection,
  learnRouter,
  loreRouter,
  promptsRouter,
  searchRouter,
  skillsRouter,
  systemsRouter,
  tokenmaxxRouter,
} from "./site-route.js";
import { timelapseReelView } from "./timelapse-reel.js";
import {
  tocEntries,
  wikiBrand,
  wikiBreadcrumb,
  wikiMobileNav,
  wikiSidebar,
} from "./wiki-chrome.js";
import { wikiStyles } from "./wiki.stylex.js";

const copyStatusText = CopyStatus.match({
  Copied: () => "Copied ✓",
  Copying: () => "",
  Failed: () => "Copy failed. Select the text and copy it.",
  Idle: () => "",
});

const sectionIndexes: ReadonlySet<string> = new Set([
  homeRouter(),
  loreRouter(),
  glossaryRouter(),
  systemsRouter(),
  skillsRouter(),
  searchRouter(),
  tokenmaxxRouter(),
]);

const missingReference = (h: HtmlBuilder<ReaderMessage>, description: string) =>
  h.p([h.Class("reader-missing"), h.Role("note")], [description]);

const readerBreadcrumb = (path: string, h: HtmlBuilder<ReaderMessage>) => {
  if (isWithinSection(promptsRouter(), path)) {
    return h.a([h.Href(promptsRouter())], ["prompts"]);
  }

  if (path.startsWith(`${loreRouter()}/`)) {
    return h.a([h.Href(loreRouter())], ["lore"]);
  }

  return h.a([h.Href(homeRouter())], ["source files"]);
};

const footerLinksPrompts = (page: ReaderModel["page"]) =>
  page.status < 400 &&
  (page.path === homeRouter() ||
    page.path === learnRouter() ||
    isWithinSection(loreRouter(), page.path) ||
    isWithinSection(promptsRouter(), page.path));

export const readerCopyControl = (
  model: Pick<ReaderModel, "clipboardAccess" | "copyPrompts" | "copyStatuses">,
  h: HtmlBuilder<ReaderMessage>,
  id: string,
  primary: boolean
) => {
  const status = copyStatusOf(model, id);
  const copied = CopyStatus.guards.Copied(status);

  return Option.match(findCopyPrompt(model, id), {
    onNone: () => missingReference(h, `The ${id} prompt is not in this page.`),
    onSome: (prompt) =>
      h.span(
        [h.Class("copy-actions")],
        [
          Button.view(
            {
              onClick: Message.ClickedCopy({ id }),
              toView: ({ button }) =>
                h.button(
                  [
                    ...button,
                    h.Class(primary ? "copy copy-primary" : "copy"),
                    h.DataAttribute("text", prompt.text),
                    h.AriaLabel(prompt.label),
                    h.Hidden(
                      !ClipboardAccess.guards.Available(model.clipboardAccess)
                    ),
                    h.DataAttribute("copied", String(copied)),
                  ],
                  [
                    readerCopyIcon(h, copied),
                    h.span(
                      [h.Class("copy-label")],
                      [copied ? "Copied ✓" : prompt.label]
                    ),
                  ]
                ),
            },
            h
          ),
          h.span(
            [h.Class("copy-status"), h.Role("status"), h.AriaLive("polite")],
            [copyStatusText(status)]
          ),
        ]
      ),
  });
};

const readerCopyPrompt = (
  model: ReaderModel,
  h: HtmlBuilder<ReaderMessage>,
  id: string
) => {
  const control = readerCopyControl(model, h, id, false);

  return Option.match(
    Option.filter(findCopyPrompt(model, id), (prompt) => prompt.showText),
    {
      onNone: () => control,
      onSome: (prompt) =>
        h.div(
          [h.Class("prompt")],
          [
            control,
            h.details(
              [h.Class("prompt-text")],
              [
                h.summary([], ["See the prompt"]),
                h.pre([], [h.code([], [prompt.text])]),
              ]
            ),
          ]
        ),
    }
  );
};

const builtSnippet = (h: HtmlBuilder<ReaderMessage>, html: string) =>
  h.div([h.Class("reader-snippet"), h.InnerHTML(html)]);

const readerCodeFence = (
  model: ReaderModel,
  h: HtmlBuilder<ReaderMessage>,
  value: string
) =>
  Option.match(
    Array.findFirst(model.codeFences, (fence) => fence.value === value),
    {
      onNone: () =>
        missingReference(h, "This code block is not in the built page."),
      onSome: ({ html }) => builtSnippet(h, html),
    }
  );

const readerSnippet = (
  model: ReaderModel,
  h: HtmlBuilder<ReaderMessage>,
  reference: SnippetReference
) =>
  Option.match(
    Array.findFirst(
      model.snippets,
      (snippet) =>
        snippet.repo === reference.repo &&
        snippet.path === reference.path &&
        snippet.at === reference.at &&
        snippet.lines === reference.lines
    ),
    {
      onNone: () =>
        missingReference(
          h,
          `The excerpt ${reference.path} lines ${reference.lines} is not in the built page.`
        ),
      onSome: ({ html }) => builtSnippet(h, html),
    }
  );

const siteSearch = (model: ReaderModel, h: HtmlBuilder<ReaderMessage>) =>
  h.div(
    [
      h.Role("search"),
      h.Class(stylex.props(wikiStyles.searchForm).className ?? ""),
    ],
    [
      h.label(
        [h.For("wiki-search"), h.Class("visually-hidden")],
        ["Search the wiki"]
      ),
      Input.view(
        {
          id: "wiki-search",
          name: "q",
          onInput: (value) => Message.UpdatedSiteSearch({ value }),
          placeholder: "Search the wiki",
          toView: ({ input }) =>
            h.input([
              ...input,
              h.Class(stylex.props(wikiStyles.searchInput).className ?? ""),
              h.Autocomplete("off"),
              h.OnKeyDownPreventDefault((key) =>
                key === "Enter"
                  ? Option.some(Message.SubmittedSiteSearch())
                  : Option.none()
              ),
            ]),
          type: "search",
          value: model.siteSearch,
        },
        h
      ),
      Button.view(
        {
          onClick: Message.SubmittedSiteSearch(),
          toView: ({ button }) =>
            h.button(
              [
                ...button,
                h.Class(stylex.props(wikiStyles.searchButton).className ?? ""),
              ],
              ["Go"]
            ),
          type: "button",
        },
        h
      ),
    ]
  );

const siteHeader = (model: ReaderModel, h: HtmlBuilder<ReaderMessage>) =>
  h.header(
    [h.Class(stylex.props(wikiStyles.header).className ?? "")],
    [
      h.nav(
        [h.AriaLabel("Primary navigation"), h.Class("site-nav")],
        [
          wikiBrand(homeRouter(), h),
          h.span(
            [h.Class(stylex.props(wikiStyles.headerLinks).className ?? "")],
            [
              h.a([h.Href(glossaryRouter())], ["glossary"]),
              h.a([h.Href(changeLogRouter())], ["recent changes"]),
              h.a([h.Href(agentGuideRouter())], ["agent guide"]),
            ]
          ),
        ]
      ),
      siteSearch(model, h),
    ]
  );

const agentPointer = (model: ReaderModel, h: HtmlBuilder<ReaderMessage>) =>
  h.p(
    [h.Class("agent-pointer visually-hidden"), h.AriaHidden(true)],
    [
      "For agents: start with the ",
      h.a(
        [h.Href(`${model.origin}${agentGuideRouter()}`), h.Tabindex(-1)],
        ["agent guide"]
      ),
      ". Every page is Markdown by default; add Accept: text/html for HTML.",
    ]
  );

const fallbackBreadcrumb = (
  model: ReaderModel,
  h: HtmlBuilder<ReaderMessage>
): readonly Html[] =>
  sectionIndexes.has(model.page.path)
    ? []
    : [
        h.nav(
          [h.AriaLabel("Breadcrumb"), h.Class("breadcrumb")],
          [
            Option.match(model.breadcrumb, {
              onNone: () => readerBreadcrumb(model.page.path, h),
              onSome: (breadcrumb) =>
                h.a([h.Href(breadcrumb.href)], [breadcrumb.label]),
            }),
            ` / ${Option.match(model.breadcrumb, {
              onNone: () => model.heading,
              onSome: (breadcrumb) => breadcrumb.name,
            })}`,
          ]
        ),
      ];

const breadcrumbView = (
  model: ReaderModel,
  h: HtmlBuilder<ReaderMessage>
): readonly Html[] =>
  Option.match(wikiBreadcrumb(model.page.path, model.heading, h), {
    onNone: () => fallbackBreadcrumb(model, h),
    onSome: (breadcrumb) => [breadcrumb],
  });

const bodyView = (model: ReaderModel, h: HtmlBuilder<ReaderMessage>) => [
  ...Option.match(model.bodyNodes, {
    onNone: () => [h.h1([], [model.heading])],
    onSome: (nodes) =>
      nodes.map((node) =>
        renderReaderNode(node, h, (id, primary) =>
          readerCopyControl(model, h, id, primary)
        )
      ),
  }),
  ...Option.match(model.cafe, {
    onNone: () => [],
    onSome: (cafe) => [
      h.submodel({
        model: cafe,
        slotId: "cafe",
        toParentMessage: (message) => Message.GotCafeMessage({ message }),
        view: CafeView.view,
      }),
    ],
  }),
  ...Option.match(model.docs, {
    onNone: () => [],
    onSome: (docs) => [
      h.submodel({
        model: docs,
        slotId: "docs",
        toParentMessage: (message) => Message.GotDocsMessage({ message }),
        view: docsView,
      }),
    ],
  }),
  ...Option.match(model.motion, {
    onNone: () => [],
    onSome: (motion) => [
      h.submodel({
        model: motion,
        slotId: "motion",
        toParentMessage: (message) => Message.GotMotionMessage({ message }),
        view: MotionView.view,
      }),
    ],
  }),
  ...model.blocks.map((block) =>
    renderReaderBlock(block, h, {
      anchors: Option.match(model.references, {
        onNone: () => [],
        onSome: (references) => references.anchors,
      }),
      codeFence: (value) => readerCodeFence(model, h, value),
      copyPrompt: (id) => readerCopyPrompt(model, h, id),
      inboundCounts: Option.match(model.references, {
        onNone: () => ({}),
        onSome: (references) => references.inboundCounts,
      }),
      pagePath: model.page.path,
      snippet: (reference) => readerSnippet(model, h, reference),
      timelapseReel: (reel) =>
        timelapseReelView(reel, model.motionPreference, h),
    })
  ),
];

const bibliographyView = (
  model: ReaderModel,
  h: HtmlBuilder<ReaderMessage>
): readonly Html[] =>
  Array.match(model.bibliography, {
    onEmpty: () => [],
    onNonEmpty: (sources) => [
      h.section(
        [h.AriaLabelledBy("sources"), h.Class("bibliography")],
        [
          h.h2([h.Id("sources")], ["Sources"]),
          h.ol(
            [],
            sources.map((source, index) =>
              h.li(
                [h.Id(`source-${index + 1}`)],
                source.kind === "linked"
                  ? [
                      h.a([h.Href(source.url)], [source.title]),
                      `. ${source.publisher}. ${source.note} Accessed ${source.accessed}.`,
                    ]
                  : [
                      `${source.title}. Recorded ${source.recordedAt}. ${source.note}.`,
                    ]
              )
            )
          ),
        ]
      ),
    ],
  });

export const view = (
  model: ReaderModel,
  h: HtmlBuilder<ReaderMessage>
): Document => {
  const toc = Option.match(model.bodyNodes, {
    onNone: () => [],
    onSome: tocEntries,
  });

  return {
    body: h.div(
      [h.Class(stylex.props(readerStyles.shell).className ?? "")],
      [
        siteHeader(model, h),
        wikiMobileNav(model.page.path, toc, h),
        h.div(
          [h.Class(stylex.props(wikiStyles.frame).className ?? "")],
          [
            wikiSidebar(model.page.path, toc, h),
            h.main(
              [h.DataAttribute("path", model.page.path)],
              [
                agentPointer(model, h),
                ...Option.match(model.newsTitle, {
                  onNone: () => [],
                  onSome: (title) => [readerNewsCallout(title, h)],
                }),
                ...breadcrumbView(model, h),
                ...bodyView(model, h),
                ...bibliographyView(model, h),
                ...readerReferences(model, h),
              ]
            ),
          ]
        ),
        readerFooter(h, footerLinksPrompts(model.page)),
      ]
    ),
    canonical: `${model.origin}${model.page.metadata.canonicalPath}`,
    ogUrl: `${model.origin}${model.page.metadata.canonicalPath}`,
    title: model.page.metadata.title,
  };
};
