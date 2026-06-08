import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, UserPlus, Power, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  // New user form state
  const [newUser, setNewUser] = useState({
    nome: "",
    email: "",
    password: "",
    perfil: "consultor",
    cnpj: "",
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: {
          action: "create",
          userData: newUser
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Usuário criado com sucesso!");
      setOpen(false);
      fetchUsers();
      setNewUser({ nome: "", email: "", password: "", perfil: "consultor", cnpj: "" });
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Erro ao criar usuário");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (user: any) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ ativo: !user.ativo })
        .eq("id", user.id);

      if (error) throw error;
      toast.success(`Usuário ${user.ativo ? "desativado" : "reativado"}`);
      fetchUsers();
    } catch (error: any) {
      toast.error("Erro ao atualizar status");
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      toast.success("E-mail de redefinição enviado!");
    } catch (error: any) {
      toast.error("Erro ao solicitar redefinição");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gerenciamento de Usuários</CardTitle>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" /> Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateUser}>
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Preencha os dados abaixo para cadastrar um novo usuário no sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input 
                    id="name" 
                    value={newUser.nome} 
                    onChange={e => setNewUser({...newUser, nome: e.target.value})}
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={newUser.email} 
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Senha Temporária</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={newUser.password} 
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="perfil">Perfil</Label>
                  <Select 
                    value={newUser.perfil} 
                    onValueChange={v => setNewUser({...newUser, perfil: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="consultor">Consultor (senha obrigatória no 1º acesso)</SelectItem>
                      <SelectItem value="cliente">Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newUser.perfil === "cliente" && (
                  <div className="grid gap-2">
                    <Label htmlFor="cnpj">CNPJ do Estabelecimento</Label>
                    <Input 
                      id="cnpj" 
                      placeholder="00.000.000/0000-00"
                      value={newUser.cnpj} 
                      onChange={e => setNewUser({...newUser, cnpj: e.target.value})}
                      required 
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Criar Usuário"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className={!user.ativo ? "opacity-60" : ""}>
                    <TableCell className="font-medium">{user.nome}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{user.email || user.id}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        user.perfil === "admin" && "bg-purple-100 text-purple-700",
                        user.perfil === "consultor" && "bg-blue-100 text-blue-700",
                        user.perfil === "cliente" && "bg-orange-100 text-orange-700"
                      )}>
                        {user.perfil}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "h-2 w-2 rounded-full inline-block mr-2",
                        user.ativo ? "bg-green-500" : "bg-red-500"
                      )} />
                      {user.ativo ? "Ativo" : "Inativo"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => resetPassword(user.email || user.id)}
                          title="Redefinir Senha"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => toggleStatus(user)}
                          className={user.ativo ? "text-destructive" : "text-green-600"}
                          title={user.ativo ? "Desativar" : "Reativar"}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
