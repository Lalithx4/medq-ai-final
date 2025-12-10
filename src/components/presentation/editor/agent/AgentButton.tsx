"use client";

import { Button } from "@/components/ui/button";
import { usePresentationState } from "@/states/presentation-state";
import { Bot } from "lucide-react";

export function AgentButton() {
  const { isAgentOpen, setIsAgentOpen } = usePresentationState();

  return (
    <Button
      onClick={() => setIsAgentOpen(!isAgentOpen)}
      variant={isAgentOpen ? "default" : "outline"}
      className={`gap-2 ${
        isAgentOpen
          ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-none"
          : ""
      }`}
      title="BioAgent - AI-powered editing assistant"
    >
      <Bot className="w-4 h-4" />
      <span className="font-semibold tracking-tight">BioAgent</span>
    </Button>
  );
}
