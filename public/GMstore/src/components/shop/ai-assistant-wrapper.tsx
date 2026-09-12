"use client";
import dynamic from "next/dynamic";

const AIAssistant = dynamic(() => import("./ai-assistant").then(m => ({ default: m.AIAssistant })), { ssr: false });

export function AIAssistantWrapper() {
  return <AIAssistant />;
}
