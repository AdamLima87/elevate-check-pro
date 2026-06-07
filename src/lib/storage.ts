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
  cep?: string;
  municipio?: string;
  uf?: string;
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
  numero: number; 
  status: "em_andamento" | "concluida";
  estabelecimento: string; 
  dataInicio: string;
  dataConclusao: string | null;
  progresso: number; 
  conformidade: number | null;
  dados: {
    estabelecimento: Estabelecimento;
    questionario: QuestionarioEstab;
    funcionarios: Funcionario[];
    fotos: Record<string, string[]>;
  };
  respostas: Record<string, Resposta>;
}

const HISTORICO_KEY = "elevare_inspecoes";
const RASCUNHO_KEY = "elevare:rascunho"; 
const NUMEROS_DISPONIVEIS_KEY = "elevare_numeros_disponiveis";
const PROXIMO_NUMERO_KEY = "elevare:proximo_numero";

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

function getNextNumero(): number {
  if (typeof localStorage === "undefined") return 1;
  const disponiveisRaw = localStorage.getItem(NUMEROS_DISPONIVEIS_KEY);
  const disponiveis = JSON.parse(disponiveisRaw || "[]") as number[];
  
  if (disponiveis.length > 0) {
    const menor = Math.min(...disponiveis);
    const novosDisponiveis = disponiveis.filter((n) => n !== menor);
    localStorage.setItem(NUMEROS_DISPONIVEIS_KEY, JSON.stringify(novosDisponiveis));
    return menor;
  }
  
  const proximoRaw = localStorage.getItem(PROXIMO_NUMERO_KEY);
  const proximo = parseInt(proximoRaw || "1", 10);
  localStorage.setItem(PROXIMO_NUMERO_KEY, (proximo + 1).toString());
  return proximo;
}

export function releaseNumero(numero: number) {
  if (typeof localStorage === "undefined") return;
  const disponiveisRaw = localStorage.getItem(NUMEROS_DISPONIVEIS_KEY);
  const disponiveis = JSON.parse(disponiveisRaw || "[]") as number[];
  
  if (!disponiveis.includes(numero)) {
    disponiveis.push(numero);
    disponiveis.sort((a, b) => a - b);
    localStorage.setItem(NUMEROS_DISPONIVEIS_KEY, JSON.stringify(disponiveis));
  }
}

export function formatNumero(n: number) {
  return `#${n.toString().padStart(3, "0")}`;
}

export function newInspecao(): Inspecao {
  const num = getNextNumero();
  return {
    id: num.toString(),
    numero: num,
    status: "em_andamento",
    estabelecimento: "",
    dataInicio: new Date().toISOString(),
    dataConclusao: null,
    progresso: 0,
    conformidade: null,
    dados: {
      estabelecimento: emptyEstabelecimento(),
      questionario: emptyQuestionario(),
      funcionarios: [],
      fotos: {},
    },
    respostas: {},
  };
}

export function loadRascunho(): Inspecao | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(RASCUNHO_KEY);
    return raw ? (JSON.parse(raw) as Inspecao) : null;
  } catch {
    return null;
  }
}

export function saveRascunho(insp: Inspecao) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(RASCUNHO_KEY, JSON.stringify(insp));
}

export function clearRascunho() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(RASCUNHO_KEY);
}

export function loadHistorico(): Inspecao[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORICO_KEY);
    return raw ? (JSON.parse(raw) as Inspecao[]) : [];
  } catch {
    return [];
  }
}

export function saveToHistorico(insp: Inspecao) {
  if (typeof localStorage === "undefined") return;
  const list = loadHistorico();
  const idx = list.findIndex((i) => i.id === insp.id);
  
  // Atualizar campos de resumo baseados nos dados internos
  if (insp.dados?.estabelecimento) {
    insp.estabelecimento = insp.dados.estabelecimento.nomeFantasia || insp.dados.estabelecimento.razaoSocial || "";
  }
  
  if (idx >= 0) list[idx] = insp;
  else list.unshift(insp);
  
  localStorage.setItem(HISTORICO_KEY, JSON.stringify(list));
}

export function deleteFromHistorico(id: string) {
  if (typeof localStorage === "undefined") return;
  const list = loadHistorico();
  const item = list.find((i) => i.id === id);
  if (item) {
    releaseNumero(item.numero);
  }
  const rascunho = loadRascunho();
  if (rascunho && rascunho.id === id) {
    clearRascunho();
  }
  const filtered = list.filter((i) => i.id !== id);
  localStorage.setItem(HISTORICO_KEY, JSON.stringify(filtered));
}

export function calcularPercentual(respostas: Record<string, Resposta>): {
  sim: number;
  nao: number;
  na: number;
  aplicavel: number;
  percentual: number;
} {
  let sim = 0, nao = 0, na = 0;
  if (respostas) {
    Object.values(respostas).forEach((r) => {
      if (r === "S") sim++;
      else if (r === "N") nao++;
      else if (r === "NA") na++;
    });
  }
  const aplicavel = sim + nao;
  const percentual = aplicavel === 0 ? 0 : (sim / aplicavel) * 100;
  return { sim, nao, na, aplicavel, percentual };
}

export function classificacao(pct: number): { label: string; emoji: string; tone: "success" | "warning" | "destructive" } {
  if (pct >= 76) return { label: "BOM", emoji: "✅", tone: "success" };
  if (pct >= 51) return { label: "REGULAR", emoji: "⚠️", tone: "warning" };
  return { label: "RUIM", emoji: "❌", tone: "destructive" };
}
