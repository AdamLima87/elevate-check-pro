import { supabase } from "@/integrations/supabase/client";
import { Inspecao, loadHistorico, HISTORICO_KEY } from "./storage";

export async function syncFromCloud() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  const { data, error } = await supabase
    .from("inspecoes")
    .select("*")
    .order("data_inicio", { ascending: false });

  if (error) {
    console.error("Error fetching from Cloud:", error);
    return;
  }

  if (data) {
    const localList = loadHistorico();
    const cloudList: Inspecao[] = data.map(item => ({
      id: item.id,
      numero: item.numero,
      status: item.status as any,
      estabelecimento: item.estabelecimento || "",
      dataInicio: item.data_inicio || new Date().toISOString(),
      dataConclusao: item.data_conclusao,
      progresso: Number(item.progresso),
      conformidade: item.conformidade ? Number(item.conformidade) : null,
      dados: item.dados as any,
      respostas: item.respostas as any,
    }));

    const mergedMap = new Map<string, Inspecao>();
    
    localList.forEach(item => mergedMap.set(item.id, item));
    cloudList.forEach(item => mergedMap.set(item.id, item));

    const newList = Array.from(mergedMap.values()).sort((a, b) => 
      new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime()
    );

    localStorage.setItem(HISTORICO_KEY, JSON.stringify(newList));
  }
}
