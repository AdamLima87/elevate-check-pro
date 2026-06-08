import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/elevare/AppShell";
import { UserAccountForm } from "@/components/auth/UserAccountForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/perfil")({
  component: PerfilPage,
});

function PerfilPage() {
  return (
    <AppShell>
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie seus dados de acesso ao sistema.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados da Conta</CardTitle>
            <CardDescription>
              Atualize seu e-mail ou altere sua senha de acesso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserAccountForm />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
