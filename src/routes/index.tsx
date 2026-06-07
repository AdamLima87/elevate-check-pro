import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/elevare/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  emptyEstabelecimento,
  loadRascunho,
  newInspecao,
  saveRascunho,
  type Estabelecimento,
} from "@/lib/storage";
import { ArrowRight, ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Checklist Elevare — Diagnóstico Sanitário" },
      { name: "description", content: "Ferramenta de diagnóstico sanitário Elevare baseada nas RDC 275/2002 e RDC 216/2004 da ANVISA." },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  const navigate = useNavigate();
  const [estab, setEstab] = useState<Estabelecimento>(emptyEstabelecimento());
  const [hasRascunho, setHasRascunho] = useState(false);

  useEffect(() => {
    const r = loadRascunho();
    if (r) {
      setEstab(r.estabelecimento);
      setHasRascunho(!r.finalizada);
    }
  }, []);

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    let formatted = digits;
    if (digits.length > 2) formatted = `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length > 5) formatted = `${formatted.slice(0, 6)}.${digits.slice(5)}`;
    if (digits.length > 8) formatted = `${formatted.slice(0, 10)}/${digits.slice(8)}`;
    if (digits.length > 12) formatted = `${formatted.slice(0, 15)}-${digits.slice(12)}`;
    return formatted;
  };

  const update = (k: keyof Estabelecimento, v: string) => {
    let finalValue = v;
    if (k === "cnpj") {
      finalValue = formatCNPJ(v);
    }
    setEstab((s) => ({ ...s, [k]: finalValue }));
  };

  const iniciar = () => {
    const required: (keyof Estabelecimento)[] = ["razaoSocial", "nomeFantasia", "cnpj", "respLegalNome", "dataHora"];
    const missing = required.filter((k) => !estab[k]);
    if (missing.length) {
      toast.error("Preencha os campos obrigatórios antes de iniciar.");
      return;
    }
    const existing = loadRascunho();
    const insp = existing && !existing.finalizada ? { ...existing, estabelecimento: estab } : { ...newInspecao(), estabelecimento: estab };
    saveRascunho(insp);
    navigate({ to: "/checklist" });
  };

  return (
    <AppShell>
      <Toaster richColors position="top-center" />
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          <ClipboardCheck className="h-3.5 w-3.5" />
          Diagnóstico Sanitário
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Identificação do Estabelecimento
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preencha os dados antes de iniciar o checklist higiênico-sanitário.
        </p>
      </div>

      {hasRascunho && (
        <Card className="mb-4 border-secondary/40 bg-accent/50">
          <CardContent className="flex items-center justify-between p-4 text-sm">
            <span>Há uma inspeção em andamento. Os dados foram restaurados.</span>
            <Button size="sm" variant="secondary" onClick={() => navigate({ to: "/checklist" })}>
              Continuar
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados do Estabelecimento</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Razão Social *" value={estab.razaoSocial} onChange={(v) => update("razaoSocial", v)} />
          <Field label="Nome Fantasia *" value={estab.nomeFantasia} onChange={(v) => update("nomeFantasia", v)} />
          <Field label="Atividade" value={estab.atividade} onChange={(v) => update("atividade", v)} />
          <Field label="CNPJ *" value={estab.cnpj} onChange={(v) => update("cnpj", v)} placeholder="00.000.000/0000-00" />
          <Field label="Endereço" value={estab.endereco} onChange={(v) => update("endereco", v)} className="sm:col-span-2" />
          <Field label="Bairro" value={estab.bairro} onChange={(v) => update("bairro", v)} />
          <Field label="Data e Hora da inspeção *" type="datetime-local" value={estab.dataHora} onChange={(v) => update("dataHora", v)} />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Responsável Legal</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome *" value={estab.respLegalNome} onChange={(v) => update("respLegalNome", v)} />
          <Field label="CPF" value={estab.respLegalCpf} onChange={(v) => update("respLegalCpf", v)} />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Responsável Técnico</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome" value={estab.respTecNome} onChange={(v) => update("respTecNome", v)} />
          <Field label="CPF" value={estab.respTecCpf} onChange={(v) => update("respTecCpf", v)} />
          <Field label="Conselho Regional" value={estab.respTecConselho} onChange={(v) => update("respTecConselho", v)} placeholder="Ex: CRN, CRMV..." />
          <Field label="Nº de Registro" value={estab.respTecRegistro} onChange={(v) => update("respTecRegistro", v)} />
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end">
        <Button size="lg" onClick={iniciar} className="gap-2">
          Iniciar Checklist <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
