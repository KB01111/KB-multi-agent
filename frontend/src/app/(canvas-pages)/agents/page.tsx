"use client";

import { useEffect } from "react";

import { Brain } from "lucide-react";

import { AgentPageLayout } from "@/components/agent-page-layout";
import { AgentManager } from "@/components/agents/agent-manager";

export default function AgentsPage() {
  return (
    <AgentPageLayout
      title="Agent Manager"
      icon={<Brain className="h-5 w-5" />}
      accentColor="hsl(var(--primary))"
      description="Create and manage AI agents and teams"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Agent Manager" }
      ]}
    >
      <AgentManager />
    </AgentPageLayout>
  );
}
