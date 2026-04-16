import { FolderOpen } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@app/ui";

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactElement;
}

const navItems: NavItem[] = [
  { label: "Projects", to: "/projects", icon: <FolderOpen size={18} aria-hidden /> },
];

export function SidebarNav({ collapsed }: { collapsed: boolean }): React.ReactElement {
  return (
    <nav aria-label="Primary" className="flex-1 py-6">
      {!collapsed && (
        <p className="px-4 mb-2 font-body text-xs uppercase tracking-[0.18em] text-ink/50">
          Navigation
        </p>
      )}
      <ul role="list" className="flex flex-col gap-0.5 px-2">
        {navItems.map(({ label, to, icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              aria-current={({ isActive }) => (isActive ? "page" : undefined)}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-sm px-3 py-2.5 text-xl transition-all duration-150",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
                  isActive
                    ? "bg-sidebar-active text-sidebar-active-text font-medium border-l-2 border-ink/60"
                    : "text-sidebar-text hover:bg-ink/10 hover:text-ink border-l-2 border-transparent"
                )
              }
            >
              <span className="shrink-0 transition-transform duration-150 group-hover:scale-110">{icon}</span>
              {!collapsed && <span className="font-body">{label}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
