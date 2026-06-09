import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, FileText, Trash2 } from "lucide-react";
import { classificacao, deleteFromHistorico } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
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

export function AllInspections() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    consultant: "all",
    status: "all",
    search: "",
  });
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      const { data: profile } = await supabase
        .from("profiles")
        .select("perfil")
        .eq("id", user?.id || "")
        .single();

      // Fetch inspections
      let query = supabase.from("inspecoes").select("*");
      
      if (filter.status !== "all") {
        query = query.eq("status", filter.status);
      }
      
      if (filter.consultant !== "all") {
        query = query.eq("consultor_id", filter.consultant);
      } else if (profile?.perfil === "consultor") {
        // Consultores só veem as suas próprias por padrão se não filtrado? 
        // Na verdade, o histórico deve mostrar tudo se for o componente unificado.
        // Mas a regra de RLS no banco já deve cuidar disso se for o caso.
      }

      const { data: inspData, error: inspError } = await query.order("data_inicio", { ascending: false });
      if (inspError) throw inspError;

      // Fetch all consultant names for the filter and display
      const { data: profData } = await supabase
        .from("profiles")
        .select("id, nome")
        .eq("perfil", "consultor");
      
      const profMap: Record<string, string> = {};
      profData?.forEach(p => profMap[p.id] = p.nome);
      setProfiles(profMap);

      setInspections(inspData || []);
    } catch (error) {
      console.error("Error fetching inspections:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter.consultant, filter.status]);

  const filteredInspections = inspections.filter(insp => {
    const searchLower = filter.search.toLowerCase();
    return (
      insp.estabelecimento_nome?.toLowerCase().includes(searchLower) ||
      insp.cnpj?.includes(searchLower) ||
      insp.numero?.toString().includes(searchLower)
    );
  });

  const handleDelete = async (id: string) => {
    try {
      await deleteFromHistorico(id);
      setInspections(prev => prev.filter(i => i.id !== id));
      toast.success("Inspeção excluída com sucesso");
    } catch (error) {
      console.error("Error deleting inspection:", error);
      toast.error("Erro ao excluir inspeção");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Nome, CNPJ ou Nº..." 
                  className="pl-9"
                  value={filter.search}
                  onChange={e => setFilter({...filter, search: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Consultor</Label>
              <Select value={filter.consultant} onValueChange={v => setFilter({...filter, consultant: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os consultores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(profiles).map(([id, nome]) => (
                    <SelectItem key={id} value={id}>{nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filter.status} onValueChange={v => setFilter({...filter, status: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Nº</TableHead>
                    <TableHead>Estabelecimento / CNPJ</TableHead>
                    <TableHead>Consultor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Conformidade</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInspections.map((insp) => {
                    const cls = insp.status === "concluida" ? classificacao(Number(insp.conformidade)) : null;
                    return (
                      <TableRow key={insp.id}>
                        <TableCell className="font-mono text-xs font-bold">#{insp.numero.toString().padStart(3, '0')}</TableCell>
                        <TableCell>
                          <div className="font-medium">{insp.estabelecimento_nome}</div>
                          <div className="text-xs text-muted-foreground">{insp.cnpj}</div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {profiles[insp.consultor_id] || "N/A"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(insp.data_inicio).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            insp.status === "concluida" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          )}>
                            {insp.status === "concluida" ? "Concluída" : "em andamento"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {cls ? (
                            <div className={cn(
                              "text-xs font-bold",
                              cls.tone === "success" && "text-success",
                              cls.tone === "warning" && "text-warning",
                              cls.tone === "destructive" && "text-destructive"
                            )}>
                              {Number(insp.conformidade).toFixed(2)}%
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">{insp.progresso}%</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => navigate({ to: "/resultado", search: { id: insp.id, readonly: true } })}
                            >
                              <FileText className="h-4 w-4 mr-2" /> Ver
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Inspeção?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Isso excluirá permanentemente os dados da inspeção.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(insp.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredInspections.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground italic">
                        Nenhuma inspeção encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
  return <label className={cn("text-xs font-medium text-muted-foreground mb-1 block", className)}>{children}</label>;
}
