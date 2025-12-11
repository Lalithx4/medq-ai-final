"use client";

import { TogglePlugin } from "@platejs/toggle/react";

import { IndentKit } from "@/components/editor/plate/plugins/indent-kit";
import { ToggleElement } from "@/components/editor/plate/ui/toggle-node";

export const ToggleKit = [
  ...IndentKit,
  TogglePlugin.withComponent(ToggleElement),
];
