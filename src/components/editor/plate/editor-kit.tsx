"use client";

import { type Value, TrailingBlockPlugin } from "platejs";
import { type TPlateEditor, useEditorRef } from "platejs/react";

import { AIKit } from "@/components/editor/plate/plugins/ai-kit";
import { AlignKit } from "@/components/editor/plate/plugins/align-kit";
import { AutoformatKit } from "@/components/editor/plate/plugins/autoformat-kit";
import { BasicBlocksKit } from "@/components/editor/plate/plugins/basic-blocks-kit";
import { BasicMarksKit } from "@/components/editor/plate/plugins/basic-marks-kit";
import { BlockMenuKit } from "@/components/editor/plate/plugins/block-menu-kit";
import { BlockPlaceholderKit } from "@/components/editor/plate/plugins/block-placeholder-kit";
import { CalloutKit } from "@/components/editor/plate/plugins/callout-kit";
import { CodeBlockKit } from "@/components/editor/plate/plugins/code-block-kit";
import { ColumnKit } from "@/components/editor/plate/plugins/column-kit";
import { CommentKit } from "@/components/editor/plate/plugins/comment-kit";
// import { CopilotKit } from "@/components/editor/plate/plugins/copilot-kit";
import { CursorOverlayKit } from "@/components/editor/plate/plugins/cursor-overlay-kit";
import { DateKit } from "@/components/editor/plate/plugins/date-kit";
import { DiscussionKit } from "@/components/editor/plate/plugins/discussion-kit";
import { DndKit } from "@/components/editor/plate/plugins/dnd-kit";
import { ExitBreakKit } from "@/components/editor/plate/plugins/exit-break-kit";
import { FixedToolbarKit } from "@/components/editor/plate/plugins/fixed-toolbar-kit";
import { FloatingToolbarKit } from "@/components/editor/plate/plugins/floating-toolbar-kit";
import { FontKit } from "@/components/editor/plate/plugins/font-kit";
import { LineHeightKit } from "@/components/editor/plate/plugins/line-height-kit";
import { LinkKit } from "@/components/editor/plate/plugins/link-kit";
import { ListKit } from "@/components/editor/plate/plugins/list-kit";
import { MarkdownKit } from "@/components/editor/plate/plugins/markdown-kit";
import { MathKit } from "@/components/editor/plate/plugins/math-kit";
import { MediaKit } from "@/components/editor/plate/plugins/media-kit";
import { MentionKit } from "@/components/editor/plate/plugins/mention-kit";
import { SlashKit } from "@/components/editor/plate/plugins/slash-kit";
import { SuggestionKit } from "@/components/editor/plate/plugins/suggestion-kit";
import { TableKit } from "@/components/editor/plate/plugins/table-kit";
import { TocKit } from "@/components/editor/plate/plugins/toc-kit";
import { ToggleKit } from "@/components/editor/plate/plugins/toggle-kit";

export const EditorKit = [
  // ...CopilotKit,
  ...AIKit,

  // Elements
  ...BasicBlocksKit,
  ...CodeBlockKit,
  ...TableKit,
  ...ToggleKit,
  ...TocKit,
  ...MediaKit,
  ...CalloutKit,
  ...ColumnKit,
  ...MathKit,
  ...DateKit,
  ...LinkKit,
  ...MentionKit,

  // Marks
  ...BasicMarksKit,
  ...FontKit,

  // Block Style
  ...ListKit,
  ...AlignKit,
  ...LineHeightKit,

  // Collaboration
  ...DiscussionKit,
  ...CommentKit,
  ...SuggestionKit,

  // Editing
  ...SlashKit,
  ...AutoformatKit,
  ...CursorOverlayKit,
  ...BlockMenuKit,
  ...DndKit,
  ...ExitBreakKit,
  TrailingBlockPlugin,

  // Parsers
  ...MarkdownKit,

  // UI
  ...BlockPlaceholderKit,
  ...FixedToolbarKit,
  ...FloatingToolbarKit,
];

export type MyEditor = TPlateEditor<Value, (typeof EditorKit)[number]>;

export const useEditor = () => useEditorRef<MyEditor>();
