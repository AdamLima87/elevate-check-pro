import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/elevare/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteFromHistorico, loadHistorico, saveRascunho, type Inspecao } from "@/lib/storage";
import { classificacao } from "@/lib/storage";
import { Trash2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [{ title: "Histórico · Elevare" }, { name: "description", content: "Histórico de inspeções sanitárias realizadas." }],
  }),
  component: HistoricoPage,
});

function HistoricoPage() {
  const navigate = useNavigate();
  const [list, setList] = useState<Inspecao[]>([]);

  useEffect(() => {
    setList(loadHistorico());
  }, []);

  const remove = (id: string) => {
    deleteFromHistorico(id);
    setList(loadHistorico());
    toast.success("Inspeção removida.");
  };

  const abrir = (insp: Inspecao) => {
    saveRascunho(insp);
    navigate({ to: "/resultado" });
  };

  return (
    <AppShell>
      <Toaster richColors position="top-center" />
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Histórico de Inspeções</h1>
        <p className="text-sm text-muted-foreground">Inspeções armazenadas localmente neste dispositivo.</p>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma inspeção salva ainda.</p>
            <Link to="/" className="mt-3 inline-block">
              <Button>Iniciar nova inspeção</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {list.map((insp) => {
            const pct = insp.percentual ?? 0;
            const cls = classificacao(pct);
            return (
              <li key={insp.id}>
                <Card>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="font-semibold">{insp.estabelecimento.nomeFantasia || insp.estabelecimento.razaoSocial}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(insp.atualizadoEm).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "rounded-md px-3 py-1.5 text-xs font-bold",
                          cls.tone === "success" && "bg-success text-success-foreground",
                          cls.tone === "warning" && "bg-warning text-warning-foreground",
                          cls.tone === "destructive" && "bg-destructive text-destructive-foreground",
                        )}
                      >
                        {pct.toFixed(0)}% · {cls.label}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => abrir(insp)} className="gap-1">
                        <FileText className="h-4 w-4" /> Abrir
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(insp.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
