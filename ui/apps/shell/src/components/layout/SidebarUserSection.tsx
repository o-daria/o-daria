import { LogOut, User } from "lucide-react";
import { useAuth } from "@app/auth";
import { cn } from "@app/ui";

export function SidebarUserSection({ collapsed }: { collapsed: boolean }): React.ReactElement {
  const { user, logout } = useAuth();

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "??";

  return (
    <div className="border-t border-ink/20 p-3">
      <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
        {/* Avatar */}
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-ivory text-xs font-body font-medium ring-1 ring-ink/30"
          aria-hidden
        >
          {initials}
        </span>

        {!collapsed && (
          <span className="flex-1 truncate font-body text-base text-ink/80">
            {user?.email ?? ""}
          </span>
        )}

        {/* US-AUTH-03: Logout button */}
        <button
          onClick={() => void logout()}
          aria-label="Log out"
          className="rounded-sm p-1 text-ink/50 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
          data-testid="sidebar-logout-button"
        >
          <LogOut size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
