import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { ClipboardList, History, Home, LogOut, Shield, User } from "lucide-react";
import { Logo } from "./Logo";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function getProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setProfile(data);
      }
    }
    getProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {(profile?.perfil === "admin" || profile?.perfil === "consultor") && (
              <>
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
              </>
            )}
            {profile?.perfil === "admin" && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                activeProps={{ className: "flex items-center gap-1.5 rounded-md px-3 py-2 bg-accent text-foreground font-medium" }}
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            {profile?.perfil === "cliente" && (
              <Link
                to="/meu-resultado"
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                activeProps={{ className: "flex items-center gap-1.5 rounded-md px-3 py-2 bg-accent text-foreground font-medium" }}
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Resultados</span>
              </Link>
            )}
            <Link
              to="/perfil"
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              activeProps={{ className: "flex items-center gap-1.5 rounded-md px-3 py-2 bg-accent text-foreground font-medium" }}
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </Link>
            <div className="ml-2 pl-2 border-l flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-muted-foreground">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
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
