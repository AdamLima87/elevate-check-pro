import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ClipboardList, History, Home } from "lucide-react";
import { Logo } from "./Logo";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              activeProps={{ className: "flex items-center gap-1.5 rounded-md px-3 py-2 bg-accent text-foreground font-medium" }}
              activeOptions={{ exact: true }}
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Início</span>
            </Link>
            <Link
              to="/historico"
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              activeProps={{ className: "flex items-center gap-1.5 rounded-md px-3 py-2 bg-accent text-foreground font-medium" }}
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Histórico</span>
            </Link>
            <Link
              to="/checklist"
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              activeProps={{ className: "flex items-center gap-1.5 rounded-md px-3 py-2 bg-accent text-foreground font-medium" }}
            >
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Checklist</span>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
      </main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Elevare Consultoria · Baseado nas RDC 275/2002 e RDC 216/2004 ANVISA
      </footer>
    </div>
  );
}
