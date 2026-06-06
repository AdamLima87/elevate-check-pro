import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/elevare/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { checklistSections, totalChecklistItems } from "@/lib/checklist-data";
import {
  emptyFuncionario,
  loadRascunho,
  newInspecao,
  saveRascunho,
  type Funcionario,
  type Inspecao,
  type Resposta,
} from "@/lib/storage";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checklist")({
  head: () => ({
    meta: [{ title: "Checklist · Elevare" }, { name: "description", content: "Lista de Verificação Higiênico-Sanitária e Questionário Socioeconômico." }],
  }),
  component: ChecklistPage,
});

function ChecklistPage() {
  const navigate = useNavigate();
  const [insp, setInsp] = useState<Inspecao | null>(null);

  useEffect(() => {
    let r = loadRascunho();
    if (!r) {
      r = newInspecao();
      saveRascunho(r);
    }
    setInsp(r);
  }, []);

  if (!insp) return null;

  const persist = (updater: (i: Inspecao) => Inspecao) => {
    setInsp((cur) => {
      if (!cur) return cur;
      const next = updater(cur);
      saveRascunho(next);
      return next;
    });
  };

  if (!insp.estabelecimento.razaoSocial) {
    return (
      <AppShell>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Preencha os dados do estabelecimento primeiro.</p>
            <Link to="/" className="mt-3 inline-block text-sm font-medium text-primary underline">
              Ir para identificação
            </Link>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const respondidos = Object.values(insp.respostas).filter((r) => r !== null && r !== undefined).length;
  const progresso = Math.round((respondidos / totalChecklistItems) * 100);

  const finalizar = () => {
    if (respondidos === 0) {
      toast.error("Responda pelo menos um item antes de finalizar.");
      return;
    }
    navigate({ to: "/resultado" });
  };

  return (
    <AppShell>
      <Toaster richColors position="top-center" />
      <div className="mb-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Inspeção</div>
        <h1 className="text-xl font-semibold">{insp.estabelecimento.nomeFantasia || insp.estabelecimento.razaoSocial}</h1>
        <div className="mt-3 flex items-center gap-3">
          <Progress value={progresso} className="h-2 flex-1" />
          <span className="text-xs font-medium text-muted-foreground">
            {respondidos}/{totalChecklistItems} ({progresso}%)
          </span>
        </div>
      </div>

      <Tabs defaultValue="a">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="a">Apêndice A — Verificação</TabsTrigger>
          <TabsTrigger value="b">Apêndice B — Questionário</TabsTrigger>
        </TabsList>

        <TabsContent value="a" className="mt-4">
          <ApendiceA insp={insp} persist={persist} />
        </TabsContent>

        <TabsContent value="b" className="mt-4">
          <ApendiceB insp={insp} persist={persist} />
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button size="lg" onClick={finalizar} className="gap-2">
          Finalizar e ver resultado <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </AppShell>
  );
}

function ApendiceA({ insp, persist }: { insp: Inspecao; persist: (u: (i: Inspecao) => Inspecao) => void }) {
  const setResposta = (id: string, r: Resposta) => {
    persist((i) => ({ ...i, respostas: { ...i.respostas, [id]: r } }));
  };

  return (
    <Accordion type="multiple" defaultValue={[checklistSections[0].id]} className="space-y-2">
      {checklistSections.map((sec) => {
        const total = sec.items.length;
        const done = sec.items.filter((it) => insp.respostas[it.id] != null).length;
        return (
          <AccordionItem key={sec.id} value={sec.id} className="overflow-hidden rounded-lg border bg-card">
            <AccordionTrigger className="bg-primary px-4 py-3 text-left text-primary-foreground hover:no-underline">
              <div className="flex w-full items-center justify-between gap-2 pr-2">
                <span className="text-sm font-semibold uppercase tracking-wide">{sec.title}</span>
                <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[11px] font-medium">
                  {done}/{total}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-0">
              <ul className="divide-y">
                {sec.items.map((item) => (
                  <li key={item.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 text-sm">
                      <span className="mr-2 font-mono text-xs font-semibold text-primary">{item.id}.</span>
                      {item.text}
                    </div>
                    <div className="flex gap-1.5">
                      {(["S", "N", "NA"] as const).map((opt) => {
                        const active = insp.respostas[item.id] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setResposta(item.id, opt)}
                            className={cn(
                              "h-9 min-w-[44px] rounded-md border px-3 text-xs font-semibold transition-colors",
                              active && opt === "S" && "border-success bg-success text-success-foreground",
                              active && opt === "N" && "border-destructive bg-destructive text-destructive-foreground",
                              active && opt === "NA" && "border-muted-foreground bg-muted-foreground text-background",
                              !active && "bg-background text-muted-foreground hover:bg-accent",
                            )}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

const PERG_FUNCIONARIO = [
  { k: "q12", t: "Tem alguma noção sobre análise de alimentos?" },
  { k: "q13", t: "Por que os alimentos estragam?" },
  { k: "q14", t: "Quais alimentos estragam mais rapidamente?" },
  { k: "q15", t: "O que você considera falta de higiene?" },
  { k: "q16", t: "Quais as consequências da falta de higiene?" },
  { k: "q17", t: "Há alimentos que podem ser perigosos? Quais?" },
  { k: "q18", t: "O que você conhece sobre bactérias?" },
  { k: "q19", t: "Qual uniforme você recebeu?" },
  { k: "q20", t: "Recebeu orientação sobre higiene pessoal?" },
  { k: "q21", t: "Recebeu material sobre Boas Práticas?" },
  { k: "q22", t: "Realiza atividades além da manipulação?" },
  { k: "q23", t: "Tem dúvidas no trabalho? Quais?" },
];

const UNIFORME_ITENS = ["Touca", "Boné", "Jaleco", "Calçado", "Camisa", "Calça", "Máscara", "Luvas"];

function ApendiceB({ insp, persist }: { insp: Inspecao; persist: (u: (i: Inspecao) => Inspecao) => void }) {
  const q = insp.questionario;
  const setQ = <K extends keyof typeof q>(k: K, v: (typeof q)[K]) => {
    persist((i) => ({ ...i, questionario: { ...i.questionario, [k]: v } }));
  };
  const toggleUniforme = (item: string) => {
    const has = q.uniformeItens.includes(item);
    setQ("uniformeItens", has ? q.uniformeItens.filter((x) => x !== item) : [...q.uniformeItens, item]);
  };

  const addFunc = () => persist((i) => ({ ...i, funcionarios: [...i.funcionarios, emptyFuncionario()] }));
  const updateFunc = (idx: number, patch: Partial<Funcionario>) =>
    persist((i) => ({
      ...i,
      funcionarios: i.funcionarios.map((f, k) => (k === idx ? { ...f, ...patch } : f)),
    }));
  const removeFunc = (idx: number) =>
    persist((i) => ({ ...i, funcionarios: i.funcionarios.filter((_, k) => k !== idx) }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do Responsável / Estabelecimento</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField label="1. Receptividade" value={q.receptividade} onChange={(v) => setQ("receptividade", v)} options={["Elevada", "Média", "Baixa"]} />
          <SelectField label="2. Número de trabalhadores" value={q.numTrabalhadores} onChange={(v) => setQ("numTrabalhadores", v)} options={["1-5", "6-10", "11-20", "21-50", "Mais de 50"]} />
          <TextField label="3. Refeições oferecidas por período" value={q.refeicoesPeriodo} onChange={(v) => setQ("refeicoesPeriodo", v)} />
          <TextField label="4. Alimentos predominantes no cardápio" value={q.alimentosCardapio} onChange={(v) => setQ("alimentosCardapio", v)} className="sm:col-span-2" />
          <SelectField label="5. Instruções aos funcionários" value={q.instrucoesFuncionarios} onChange={(v) => setQ("instrucoesFuncionarios", v)} options={["Sim", "Não"]} />
          <TextField label="5.1 Qual?" value={q.instrucoesQual} onChange={(v) => setQ("instrucoesQual", v)} />
          <SelectField label="6. Cursos e treinamentos (frequência)" value={q.cursosTreinamentos} onChange={(v) => setQ("cursosTreinamentos", v)} options={["Nunca", "Anual", "Semestral", "Trimestral", "Mensal"]} />
          <SelectField label="7. Avaliação pós-treinamento" value={q.avaliacaoPos} onChange={(v) => setQ("avaliacaoPos", v)} options={["Sim", "Não"]} />
          <SelectField label="8. Fornecimento de uniforme (frequência)" value={q.fornecimentoUniformeFreq} onChange={(v) => setQ("fornecimentoUniformeFreq", v)} options={["Nunca", "Anual", "Semestral", "Trimestral", "Mensal"]} />
          <div className="sm:col-span-2">
            <Label className="mb-2 block text-xs font-medium text-muted-foreground">8.1 Itens fornecidos</Label>
            <div className="flex flex-wrap gap-3">
              {UNIFORME_ITENS.map((it) => (
                <label key={it} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={q.uniformeItens.includes(it)} onCheckedChange={() => toggleUniforme(it)} />
                  {it}
                </label>
              ))}
            </div>
          </div>
          <SelectField label="9. Remuneração por comissão" value={q.comissao} onChange={(v) => setQ("comissao", v)} options={["Sim", "Não"]} />
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">10. Alterações desejadas no estabelecimento</Label>
            <Textarea rows={3} value={q.alteracoesDesejadas} onChange={(e) => setQ("alteracoesDesejadas", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Dados dos Funcionários</CardTitle>
          <Button size="sm" variant="secondary" onClick={addFunc} className="gap-1">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {insp.funcionarios.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum funcionário cadastrado.</p>
          )}
          <Accordion type="multiple" className="space-y-2">
            {insp.funcionarios.map((f, idx) => (
              <AccordionItem key={idx} value={`f-${idx}`} className="rounded-lg border bg-background">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="text-sm font-medium">
                    {f.nome || `Funcionário ${idx + 1}`}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 px-4 pb-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <TextField label="Nome" value={f.nome} onChange={(v) => updateFunc(idx, { nome: v })} />
                    <TextField label="Idade" value={f.idade} onChange={(v) => updateFunc(idx, { idade: v })} />
                    <SelectField
                      label="Escolaridade"
                      value={f.escolaridade}
                      onChange={(v) => updateFunc(idx, { escolaridade: v })}
                      options={[
                        "A - Analfabeto",
                        "B - Fundamental incompleto",
                        "C - Fundamental completo",
                        "D - Médio incompleto",
                        "E - Médio completo",
                        "F - Superior",
                      ]}
                    />
                    <SelectField label="Carteira assinada" value={f.carteiraAssinada} onChange={(v) => updateFunc(idx, { carteiraAssinada: v })} options={["Sim", "Não"]} />
                    <TextField label="Renda" value={f.renda} onChange={(v) => updateFunc(idx, { renda: v })} />
                    <TextField label="Banhos diários" value={f.banhosDiarios} onChange={(v) => updateFunc(idx, { banhosDiarios: v })} />
                    <SelectField label="Casa própria" value={f.casaPropria} onChange={(v) => updateFunc(idx, { casaPropria: v })} options={["Sim", "Não"]} />
                    <TextField label="Nº de cômodos" value={f.numComodos} onChange={(v) => updateFunc(idx, { numComodos: v })} />
                    <SelectField label="Curso de Boas Práticas (BMP)" value={f.cursoBMP} onChange={(v) => updateFunc(idx, { cursoBMP: v })} options={["Sim", "Não"]} />
                  </div>
                  <div className="space-y-3 border-t pt-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Questionário (12–26)
                    </div>
                    {PERG_FUNCIONARIO.map((p) => (
                      <div key={p.k}>
                        <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{p.t}</Label>
                        <Textarea
                          rows={2}
                          value={f.respostas[p.k] ?? ""}
                          onChange={(e) => updateFunc(idx, { respostas: { ...f.respostas, [p.k]: e.target.value } })}
                        />
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeFunc(idx)} className="gap-1 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" /> Remover funcionário
                  </Button>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

function TextField({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
      >
        <option value="">Selecione...</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
