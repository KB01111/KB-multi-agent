"use client";

import React, { useState } from "react";
import { EnhancedSidebar } from "./enhanced-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "next-themes";
import { MCPConfigModal } from "./mcp-config-modal";
import { SettingsModal } from "./settings-modal";
import { cn } from "@/lib/utils";

export function EnhancedLayout({ children }: { children: React.ReactNode }) {
  const [showMCPConfigModal, setShowMCPConfigModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <SidebarProvider>
        <div className="flex h-screen w-screen overflow-hidden">
          <EnhancedSidebar 
            showMCPConfigModal={showMCPConfigModal}
            showSettingsModal={showSettingsModal}
            onShowMCPConfigModal={() => setShowMCPConfigModal(true)}
            onShowSettingsModal={() => setShowSettingsModal(true)}
          />
          
          <main className={cn(
            "flex-1 overflow-auto transition-all duration-300 ease-in-out",
            "bg-background text-foreground"
          )}>
            {children}
          </main>
        </div>

        {/* Modals */}
        <MCPConfigModal
          isOpen={showMCPConfigModal}
          onClose={() => setShowMCPConfigModal(false)}
        />
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />
      </SidebarProvider>
    </ThemeProvider>
  );
}
