import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export interface GlobalLayoutProps {
  children?: React.ReactNode;
}

export function GlobalLayout({ children }: GlobalLayoutProps): React.ReactElement {
  return (
    <div className="flex h-screen overflow-hidden bg-main-bg">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8 bg-main-bg">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
