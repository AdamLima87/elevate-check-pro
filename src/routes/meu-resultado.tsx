import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/elevare/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Search, FileText, Download } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { classificacao, type Inspecao } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/meu-resultado")({
  component: ClientePage,
});

function ClientePage() {
  const [cnpj, setCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [inspections, setInspections] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) {
      toast.error("Informe um CNPJ válido com 14 dígitos");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inspecoes")
        .select("*")
        .eq("cnpj", cleanCnpj)
        .eq("status", "concluida")
        .order("data_conclusao", { ascending: false });

      if (error) throw error;
      setInspections(data || []);
      setHasSearched(true);
    } catch (error: any) {
      toast.error("Erro ao buscar inspeções");
    } finally {
      setLoading(false);
    }
  };

  const verRelatorio = (insp: any) => {
    // Redirect to result page with read-only view logic
    // We'll need to mock the storage if necessary or just pass the ID
    navigate({ to: "/resultado", search: { id: insp.id, readonly: true } });
  };

  return (
    <ProtectedRoute allowedProfiles={["cliente", "admin"]}>
      <AppShell>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Meus Resultados</h1>
          <p className="text-muted-foreground">Consulte os relatórios de inspeção do seu estabelecimento.</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Buscar por CNPJ</CardTitle>
            <CardDescription>Informe o CNPJ do estabelecimento para localizar as inspeções concluídas.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  className="max-w-xs"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Buscar
              </Button>
            </form>
          </CardContent>
        </Card>

        {hasSearched && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Resultados Encontrados</h2>
            {inspections.length === 0 ? (
              <p className="text-muted-foreground italic text-center py-8">Nenhuma inspeção concluída encontrada para este CNPJ.</p>
            ) : (
              <div className="grid gap-4">
                {inspections.map((insp) => {
                  const conf = Number(insp.conformidade);
                  const cls = classificacao(conf);
                  return (
                    <Card key={insp.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-medium text-lg">{insp.estabelecimento_nome}</h3>
                          <p className="text-sm text-muted-foreground">
                            Concluída em: {new Date(insp.data_conclusao).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold uppercase",
                            cls.tone === "success" && "bg-success/15 text-success",
                            cls.tone === "warning" && "bg-warning/15 text-warning",
                            cls.tone === "destructive" && "bg-destructive/15 text-destructive"
                          )}>
                            {cls.emoji} {conf.toFixed(0)}% {cls.label}
                          </div>
                          <Button variant="outline" size="sm" onClick={() => verRelatorio(insp)} className="gap-2">
                            <FileText className="h-4 w-4" /> Relatório
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
