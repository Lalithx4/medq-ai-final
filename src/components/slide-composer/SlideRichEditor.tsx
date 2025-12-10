"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { Plate } from "platejs/react";
import { MarkdownPlugin } from "@platejs/markdown";

import { usePlateEditor } from "@/components/plate/hooks/usePlateEditor";
import { Editor } from "@/components/plate/ui/editor";
import { BasicBlocksKit } from "@/components/plate/plugins/basic-blocks-kit";
import { ListKit } from "@/components/plate/plugins/list-kit";
import { BasicMarksKit } from "@/components/plate/plugins/basic-marks-kit";
import { MarkdownKit } from "@/components/plate/plugins/markdown-kit";

interface SlideRichEditorProps {
  markdown: string;
  onMarkdownChange: (value: string) => void;
  className?: string;
}

export function SlideRichEditor({ markdown, onMarkdownChange, className }: SlideRichEditorProps) {
  const plugins = useMemo(
    () => [
      // Basic block types (paragraphs, headings)
      ...BasicBlocksKit,
      // Lists for bullets/numbered lists
      ...ListKit,
      // Bold/italic and simple marks
      ...BasicMarksKit,
      // Markdown parser/serializer integration
      ...MarkdownKit,
      // Ensure MarkdownPlugin is available for initialMarkdown support
      MarkdownPlugin.configure({}),
    ],
    [],
  );

  const latestMarkdownRef = useRef(markdown ?? "");
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    latestMarkdownRef.current = markdown ?? "";
  }, [markdown]);

  const editor = usePlateEditor({
    id: "slide-rich-editor",
    plugins,
    initialMarkdown: markdown ?? "",
  });

  if (!editor) return null;

  return (
    <div className={className}>
      <Plate
        editor={editor}
        onValueChange={({ value }) => {
          try {
            // First onValueChange often fires on mount; ignore it so toggling
            // Edit/Done without user changes does not rewrite markdown.
            if (!hasInitializedRef.current) {
              hasInitializedRef.current = true;
              return;
            }

            const api = editor.getApi(MarkdownPlugin);
            const internalValue = (editor as any).tf?.getValue?.() ?? value;
            const md = api.markdown.serialize(internalValue as any);
            const prev = latestMarkdownRef.current;
            // Avoid wiping out existing non-empty markdown with an empty value
            if (!md.trim() && prev.trim().length > 0) {
              return;
            }
            onMarkdownChange(md);
          } catch {
            // best-effort; ignore serialization errors
          }
        }}
      >
        <Editor variant="ai" />
      </Plate>
    </div>
  );
}
