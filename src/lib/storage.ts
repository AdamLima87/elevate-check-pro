export type Resposta = "S" | "N" | "NA" | null;

export interface Estabelecimento {
  razaoSocial: string;
  nomeFantasia: string;
  atividade: string;
  cnpj: string;
  endereco: string;
  bairro: string;
  respLegalNome: string;
  respLegalCpf: string;
  respTecNome: string;
  respTecCpf: string;
  respTecConselho: string;
  respTecRegistro: string;
  dataHora: string;
}

export interface Funcionario {
  nome: string;
  idade: string;
  escolaridade: string;
  carteiraAssinada: string;
  renda: string;
  banhosDiarios: string;
  casaPropria: string;
  numComodos: string;
  cursoBMP: string;
  // questionário 12-26
  respostas: Record<string, string>;
}

export interface QuestionarioEstab {
  receptividade: string;
  numTrabalhadores: string;
  refeicoesPeriodo: string;
  alimentosCardapio: string;
  instrucoesFuncionarios: string;
  instrucoesQual: string;
  cursosTreinamentos: string;
  avaliacaoPos: string;
  fornecimentoUniformeFreq: string;
  uniformeItens: string[];
  comissao: string;
  alteracoesDesejadas: string;
}

export interface Inspecao {
  id: string;
  criadoEm: string;
  atualizadoEm: string;
  estabelecimento: Estabelecimento;
  respostas: Record<string, Resposta>;
  fotos: Record<string, string[]>;
  questionario: QuestionarioEstab;
  funcionarios: Funcionario[];
  finalizada: boolean;
  percentual?: number;
}

const HISTORICO_KEY = "elevare:historico";
const RASCUNHO_KEY = "elevare:rascunho";

export function emptyEstabelecimento(): Estabelecimento {
  return {
    razaoSocial: "",
    nomeFantasia: "",
    atividade: "",
    cnpj: "",
    endereco: "",
    bairro: "",
    respLegalNome: "",
    respLegalCpf: "",
    respTecNome: "",
    respTecCpf: "",
    respTecConselho: "",
    respTecRegistro: "",
    dataHora: new Date().toISOString().slice(0, 16),
  };
}

export function emptyQuestionario(): QuestionarioEstab {
  return {
    receptividade: "",
    numTrabalhadores: "",
    refeicoesPeriodo: "",
    alimentosCardapio: "",
    instrucoesFuncionarios: "",
    instrucoesQual: "",
    cursosTreinamentos: "",
    avaliacaoPos: "",
    fornecimentoUniformeFreq: "",
    uniformeItens: [],
    comissao: "",
    alteracoesDesejadas: "",
  };
}

export function emptyFuncionario(): Funcionario {
  return {
    nome: "",
    idade: "",
    escolaridade: "",
    carteiraAssinada: "",
    renda: "",
    banhosDiarios: "",
    casaPropria: "",
    numComodos: "",
    cursoBMP: "",
    respostas: {},
  };
}

export function newInspecao(): Inspecao {
  return {
    id: crypto.randomUUID(),
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    estabelecimento: emptyEstabelecimento(),
    respostas: {},
    fotos: {},
    questionario: emptyQuestionario(),
    funcionarios: [],
    finalizada: false,
  };
}

export function loadRascunho(): Inspecao | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RASCUNHO_KEY);
    return raw ? (JSON.parse(raw) as Inspecao) : null;
  } catch {
    return null;
  }
}

export function saveRascunho(insp: Inspecao) {
  if (typeof window === "undefined") return;
  insp.atualizadoEm = new Date().toISOString();
  localStorage.setItem(RASCUNHO_KEY, JSON.stringify(insp));
}

export function clearRascunho() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RASCUNHO_KEY);
}

export function loadHistorico(): Inspecao[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORICO_KEY);
    return raw ? (JSON.parse(raw) as Inspecao[]) : [];
  } catch {
    return [];
  }
}

export function saveToHistorico(insp: Inspecao) {
  const list = loadHistorico();
  const idx = list.findIndex((i) => i.id === insp.id);
  if (idx >= 0) list[idx] = insp;
  else list.unshift(insp);
  localStorage.setItem(HISTORICO_KEY, JSON.stringify(list));
}

export function deleteFromHistorico(id: string) {
  const list = loadHistorico().filter((i) => i.id !== id);
  localStorage.setItem(HISTORICO_KEY, JSON.stringify(list));
}

export function calcularPercentual(respostas: Record<string, Resposta>): {
  sim: number;
  nao: number;
  na: number;
  aplicavel: number;
  percentual: number;
} {
  let sim = 0, nao = 0, na = 0;
  Object.values(respostas).forEach((r) => {
    if (r === "S") sim++;
    else if (r === "N") nao++;
    else if (r === "NA") na++;
  });
  const aplicavel = sim + nao;
  const percentual = aplicavel === 0 ? 0 : (sim / aplicavel) * 100;
  return { sim, nao, na, aplicavel, percentual };
}

export function classificacao(pct: number): { label: string; emoji: string; tone: "success" | "warning" | "destructive" } {
  if (pct >= 76) return { label: "BOM", emoji: "✅", tone: "success" };
  if (pct >= 51) return { label: "REGULAR", emoji: "⚠️", tone: "warning" };
  return { label: "RUIM", emoji: "❌", tone: "destructive" };
}
