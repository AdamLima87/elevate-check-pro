import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/elevare/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  calcularPercentual,
  classificacao,
  clearRascunho,
  loadRascunho,
  saveToHistorico,
  type Inspecao,
} from "@/lib/storage";
import { checklistSections } from "@/lib/checklist-data";
import { FileDown, MessageCircle, Mail, Save, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { gerarPDF } from "@/lib/pdf";

export const Route = createFileRoute("/resultado")({
  head: () => ({
    meta: [{ title: "Resultado · Elevare" }, { name: "description", content: "Resultado da inspeção sanitária com pontuação, gráfico e não conformidades." }],
  }),
  component: ResultadoPage,
});

function ResultadoPage() {
  const navigate = useNavigate();
  const [insp, setInsp] = useState<Inspecao | null>(null);

  useEffect(() => {
    const r = loadRascunho();
    if (!r || !r.estabelecimento.razaoSocial) {
      navigate({ to: "/" });
      return;
    }
    setInsp(r);
  }, [navigate]);

  const score = useMemo(() => (insp ? calcularPercentual(insp.respostas) : null), [insp]);
  const cls = score ? classificacao(score.percentual) : null;

  const chartData = useMemo(() => {
    if (!insp) return [];
    return checklistSections.map((sec) => {
      const itens = sec.items.map((i) => insp.respostas[i.id]);
      const s = itens.filter((r) => r === "S").length;
      const n = itens.filter((r) => r === "N").length;
      const aplic = s + n;
      const pct = aplic === 0 ? 0 : Math.round((s / aplic) * 100);
      return { secao: sec.title.split(",")[0].slice(0, 18), pct };
    });
  }, [insp]);

  const naoConformidades = useMemo(() => {
    if (!insp) return [];
    const out: { id: string; text: string; secao: string }[] = [];
    checklistSections.forEach((sec) => {
      sec.items.forEach((it) => {
        if (insp.respostas[it.id] === "N") out.push({ id: it.id, text: it.text, secao: sec.title });
      });
    });
    return out;
  }, [insp]);

  if (!insp || !score || !cls) return null;

  const finalInsp: Inspecao = { ...insp, finalizada: true, percentual: score.percentual };

  const salvar = () => {
    saveToHistorico(finalInsp);
    toast.success("Inspeção salva no histórico.");
  };

  const novaInspecao = () => {
    saveToHistorico(finalInsp);
    clearRascunho();
    navigate({ to: "/" });
  };

  const compartilharWhats = () => {
    const msg = `*Checklist Elevare*%0A${insp.estabelecimento.nomeFantasia}%0APontuação: ${score.percentual.toFixed(1)}%25 - ${cls.label}%0ANão conformidades: ${naoConformidades.length}`;
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const enviarEmail = () => {
    const subject = encodeURIComponent(`Inspeção sanitária — ${insp.estabelecimento.nomeFantasia}`);
    const body = encodeURIComponent(
      `Estabelecimento: ${insp.estabelecimento.razaoSocial}\nPontuação: ${score.percentual.toFixed(1)}% — ${cls.label}\nNão conformidades: ${naoConformidades.length}`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const baixarPDF = () => {
    try {
      gerarPDF(finalInsp);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível gerar o PDF.");
    }
  };

  return (
    <AppShell>
      <Toaster richColors position="top-center" />
      <div className="mb-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Resultado da Inspeção</div>
        <h1 className="text-2xl font-semibold">{insp.estabelecimento.nomeFantasia}</h1>
        <p className="text-sm text-muted-foreground">{insp.estabelecimento.razaoSocial}</p>
      </div>

      <Card className={cn("border-2", cls.tone === "success" && "border-success/40", cls.tone === "warning" && "border-warning/50", cls.tone === "destructive" && "border-destructive/40")}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Pontuação geral</div>
              <div className="mt-1 text-5xl font-bold tracking-tight">{score.percentual.toFixed(1)}%</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {score.sim} conformes · {score.nao} não conformes · {score.na} não se aplica
              </div>
            </div>
            <div
              className={cn(
                "rounded-xl px-6 py-4 text-center",
                cls.tone === "success" && "bg-success text-success-foreground",
                cls.tone === "warning" && "bg-warning text-warning-foreground",
                cls.tone === "destructive" && "bg-destructive text-destructive-foreground",
              )}
            >
              <div className="text-3xl">{cls.emoji}</div>
              <div className="mt-1 text-lg font-bold">{cls.label}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button onClick={baixarPDF} className="gap-1.5"><FileDown className="h-4 w-4" /> PDF</Button>
        <Button onClick={compartilharWhats} variant="secondary" className="gap-1.5"><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
        <Button onClick={enviarEmail} variant="secondary" className="gap-1.5"><Mail className="h-4 w-4" /> E-mail</Button>
        <Button onClick={salvar} variant="outline" className="gap-1.5"><Save className="h-4 w-4" /> Salvar</Button>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Desempenho por seção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 60, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="secao" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="pct" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Não conformidades ({naoConformidades.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {naoConformidades.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma não conformidade identificada.</p>
          ) : (
            <ul className="space-y-2">
              {naoConformidades.map((nc) => (
                <li key={nc.id} className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-destructive">{nc.secao}</div>
                  <div className="mt-1"><span className="font-mono text-xs">{nc.id}.</span> {nc.text}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={() => navigate({ to: "/checklist" })}>Voltar ao checklist</Button>
        <Button onClick={novaInspecao} className="gap-1.5"><RotateCcw className="h-4 w-4" /> Nova inspeção</Button>
      </div>
    </AppShell>
  );
}
