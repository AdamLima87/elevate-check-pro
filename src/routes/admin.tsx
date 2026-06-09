import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/elevare/AppShell";
import { UserManagement } from "@/components/admin/UserManagement";
import { AllInspections } from "@/components/admin/AllInspections";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Users } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  return (
    <ProtectedRoute allowedProfiles={["admin"]}>
      <AppShell>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
          <p className="text-muted-foreground">Gerencie o sistema, usuários e visualize todas as inspeções.</p>
        </div>

        <Tabs defaultValue="inspections" className="space-y-6">
          <TabsList>
            <TabsTrigger value="inspections" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Inspeções
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="inspections" className="space-y-6">
            <AllInspections />
          </TabsContent>
          
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </AppShell>
    </ProtectedRoute>
  );
}
