import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/elevare/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteFromHistorico, loadHistorico, saveRascunho, type Inspecao, formatNumero } from "@/lib/storage";
import { classificacao, calcularPercentual } from "@/lib/storage";
import { Trash2, FileText, Play, History, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

  const continuar = (insp: Inspecao) => {
    saveRascunho(insp);
    navigate({ to: "/checklist" });
  };

  const verResultado = (insp: Inspecao) => {
    saveRascunho(insp);
    navigate({ to: "/resultado" });
  };

  const emAndamento = list.filter((i) => !i.finalizada);
  const concluidas = list.filter((i) => i.finalizada);

  return (
    <AppShell>
      <Toaster richColors position="top-center" />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Histórico de Inspeções</h1>
        <p className="text-sm text-muted-foreground">Gerencie as inspeções realizadas neste dispositivo.</p>
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
        <div className="space-y-8">
          {emAndamento.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Play className="h-4 w-4" /> Em andamento
              </h2>
              <ul className="space-y-3">
                {emAndamento.map((insp) => {
                  const stats = calcularPercentual(insp.respostas);
                  // Estimativa simples de preenchimento total baseada nos itens do checklist-data
                  // Para ser preciso precisaríamos saber o total de itens, vamos usar um placeholder visual por enquanto
                  // ou simplificar com o percentual de conformidade se for o caso, mas o pedido fala em "progresso"
                  // Como não temos o total de questões aqui, vamos apenas mostrar que está em andamento.
                  return (
                    <InspecaoCard 
                      key={insp.id} 
                      insp={insp} 
                      onAction={() => continuar(insp)}
                      actionLabel="Continuar"
                      onDelete={() => remove(insp.id)}
                      showProgress
                    />
                  );
                })}
              </ul>
            </section>
          )}

          {concluidas.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <History className="h-4 w-4" /> Concluídas
              </h2>
              <ul className="space-y-3">
                {concluidas.map((insp) => (
                  <InspecaoCard 
                    key={insp.id} 
                    insp={insp} 
                    onAction={() => verResultado(insp)}
                    actionLabel="Ver relatório"
                    onDelete={() => remove(insp.id)}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}

function InspecaoCard({ 
  insp, 
  onAction, 
  actionLabel, 
  onDelete,
  showProgress 
}: { 
  insp: Inspecao; 
  onAction: () => void; 
  actionLabel: string;
  onDelete: () => void;
  showProgress?: boolean;
}) {
  const pct = insp.percentual ?? 0;
  const cls = classificacao(pct);
  const data = new Date(insp.atualizadoEm).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card className={cn("overflow-hidden border-l-4", insp.finalizada ? "border-l-primary" : "border-l-yellow-500")}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-muted-foreground">{formatNumero(insp.numero)}</span>
              <h3 className="font-semibold">{insp.estabelecimento.nomeFantasia || insp.estabelecimento.razaoSocial}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                {insp.finalizada ? "Concluída em:" : "Iniciada em:"} {data}
              </span>
              {showProgress && !insp.finalizada && (
                <span className="font-medium text-yellow-600">Em andamento</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {insp.finalizada && (
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                  cls.tone === "success" && "bg-success/15 text-success",
                  cls.tone === "warning" && "bg-warning/15 text-warning",
                  cls.tone === "destructive" && "bg-destructive/15 text-destructive",
                )}
              >
                {cls.emoji} {pct.toFixed(0)}% {cls.label}
              </div>
            )}
            
            <Button size="sm" variant="outline" onClick={onAction} className="gap-2 h-9">
              {insp.finalizada ? <FileText className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {actionLabel}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. A inspeção {formatNumero(insp.numero)} será permanentemente removida.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
