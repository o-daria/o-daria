import { useState } from "react";
import { cn } from "@app/ui";
import { SidebarLogo } from "./SidebarLogo";
import { SidebarNav } from "./SidebarNav";
import { SidebarToggle } from "./SidebarToggle";
import { SidebarUserSection } from "./SidebarUserSection";

const STORAGE_KEY = "app.sidebarCollapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function Sidebar(): React.ReactElement {
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);

  const toggle = (): void => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  return (
    <aside
      aria-label="Main navigation"
      className={cn(
        "flex flex-col h-full bg-sidebar-bg text-sidebar-text transition-all duration-200 border-r border-ink/20 shadow-[2px_0_16px_rgba(28,43,34,0.18)]",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <SidebarLogo collapsed={collapsed} />
      <SidebarNav collapsed={collapsed} />
      <div className="mt-auto">
        <SidebarToggle collapsed={collapsed} onToggle={toggle} />
        <SidebarUserSection collapsed={collapsed} />
      </div>
    </aside>
  );
}
