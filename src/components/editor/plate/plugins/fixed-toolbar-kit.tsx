"use client";

import { createPlatePlugin } from "platejs/react";

import { FixedToolbar } from "@/components/editor/plate/ui/fixed-toolbar";
import { FixedToolbarButtons } from "@/components/editor/plate/ui/fixed-toolbar-buttons";

export const FixedToolbarKit = [
  createPlatePlugin({
    key: "fixed-toolbar",
    render: {
      beforeContainer: () => (
        <FixedToolbar>
          <FixedToolbarButtons />
        </FixedToolbar>
      ),
    },
  }),
];
