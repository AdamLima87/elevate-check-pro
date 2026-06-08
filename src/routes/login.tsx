import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Logo } from "@/components/elevare/Logo";
import { Loader2, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";


export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [isAdminExists, setIsAdminExists] = useState(true);

  // Registration state for first admin
  const [regData, setRegData] = useState({
    nome: "",
    email: "",
    password: ""
  });

  useEffect(() => {
    async function checkAdmin() {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("perfil", "admin");
      
      setIsAdminExists(!!count && count > 0);
    }
    checkAdmin();
  }, []);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!data.user) throw new Error("Usuário não encontrado");

      // Fetch profile to redirect correctly
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("perfil, ativo")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        console.error("Erro ao buscar perfil:", profileError);
        // Fallback for new users where trigger might be slow
        toast.info("Perfil sendo configurado, tentando novamente...");
        await new Promise(resolve => setTimeout(resolve, 2000));
        const { data: retryProfile } = await supabase
          .from("profiles")
          .select("perfil, ativo")
          .eq("id", data.user.id)
          .single();
        
        if (retryProfile) {
          redirectUser(retryProfile);
          return;
        }
        throw new Error("Perfil não encontrado. Entre em contato com o suporte.");
      }

      if (!profile.ativo) {
        await supabase.auth.signOut();
        throw new Error("Sua conta está desativada.");
      }

      redirectUser(profile);
      toast.success("Login realizado com sucesso!");
    } catch (error: any) {
      console.error("Erro no login:", error);
      
      let errorMessage = "Erro ao fazer login";
      
      if (error.message?.includes("Invalid login credentials") || error.status === 400) {
        errorMessage = "E-mail ou senha incorretos. Verifique suas credenciais.";
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = "E-mail não confirmado. Verifique sua caixa de entrada.";
      } else if (error.message === "Sua conta está desativada.") {
        errorMessage = "Sua conta está desativada. Entre em contato com o administrador.";
      } else if (error.message === "Perfil não encontrado. Entre em contato com o suporte.") {
        errorMessage = "Perfil não encontrado. Verifique se seu cadastro foi concluído.";
      } else if (error.status === 429) {
        errorMessage = "Muitas tentativas de login. Tente novamente mais tarde.";
      } else if (error.message?.includes("Database error") || error.code === "PGRST301") {
        errorMessage = "Erro de permissão no banco de dados. Contate o suporte técnico.";
      } else {
        errorMessage = error.message || "Ocorreu um erro inesperado ao tentar acessar o sistema.";
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const redirectUser = (profile: any) => {
    if (profile?.perfil === "admin") {
      navigate({ to: "/admin" });
    } else if (profile?.perfil === "cliente") {
      navigate({ to: "/meu-resultado" });
    } else {
      navigate({ to: "/" });
    }
  };


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: regData.email,
        password: regData.password,
        options: {
          data: {
            nome: regData.nome,
          }
        }
      });

      if (error) throw error;
      
      toast.success("Administrador criado! Verifique seu e-mail ou faça login.");
      setShowRegister(false);
      setIsAdminExists(true);
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar administrador");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {

    if (!email) {
      toast.error("Informe seu e-mail primeiro");
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      toast.success("E-mail de recuperação enviado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar e-mail");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 flex flex-col items-center pb-8">
          <Logo />
          <div className="text-center">
            <CardTitle className="text-2xl">Acesso ao Sistema</CardTitle>
            <CardDescription>Entre com suas credenciais para continuar</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="exemplo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
            <div className="flex flex-col gap-3 text-center">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="text-sm text-primary hover:underline"
              >
                Esqueci minha senha
              </button>

              {!isAdminExists && (
                <Dialog open={showRegister} onOpenChange={setShowRegister}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full gap-2 border-primary/30 hover:bg-primary/5">
                      <UserPlus className="h-4 w-4" /> Criar Primeiro Admin
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleRegister}>
                      <DialogHeader>
                        <DialogTitle>Cadastro de Administrador</DialogTitle>
                        <DialogDescription>
                          Não há administradores cadastrados. Crie a primeira conta para gerenciar o sistema.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="reg-nome">Nome</Label>
                          <Input 
                            id="reg-nome" 
                            value={regData.nome} 
                            onChange={e => setRegData({...regData, nome: e.target.value})}
                            required 
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="reg-email">E-mail</Label>
                          <Input 
                            id="reg-email" 
                            type="email" 
                            value={regData.email} 
                            onChange={e => setRegData({...regData, email: e.target.value})}
                            required 
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="reg-pass">Senha</Label>
                          <Input 
                            id="reg-pass" 
                            type="password" 
                            value={regData.password} 
                            onChange={e => setRegData({...regData, password: e.target.value})}
                            required 
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={loading}>
                          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Criar Admin"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
