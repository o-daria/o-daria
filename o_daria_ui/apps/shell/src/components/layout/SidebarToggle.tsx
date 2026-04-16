import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@app/ui";

interface SidebarToggleProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function SidebarToggle({ collapsed, onToggle }: SidebarToggleProps): React.ReactElement {
  return (
    <button
      onClick={onToggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className={cn(
        "flex w-full items-center px-4 py-2 text-disabled hover:text-jade transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold",
        collapsed && "justify-center px-0"
      )}
      data-testid="sidebar-toggle"
    >
      {collapsed ? <ChevronRight size={16} aria-hidden /> : <ChevronLeft size={16} aria-hidden />}
    </button>
  );
}
