"use client";

import { LinkPlugin } from "@platejs/link/react";

import { LinkElement } from "@/components/editor/plate/ui/link-node";
import { LinkFloatingToolbar } from "@/components/editor/plate/ui/link-toolbar";

export const LinkKit = [
  LinkPlugin.configure({
    render: {
      node: LinkElement,
      afterEditable: () => <LinkFloatingToolbar />,
    },
  }),
];
