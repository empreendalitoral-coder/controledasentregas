import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Truck, Mail, Phone, Lock, User, ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Entrega Pro" },
      { name: "description", content: "Entre ou crie sua conta no Entrega Pro." },
      { property: "og:title", content: "Entrar — Entrega Pro" },
      {
        property: "og:description",
        content: "Acesse sua conta do Entrega Pro e controle entregas, gastos e recebimentos.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://meuentregapro.app/auth" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://meuentregapro.app/auth" }],
  }),

  component: AuthPage,
});

type Mode = "login" | "signup" | "reset";
type Channel = "email" | "telefone";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [channel, setChannel] = useState<Channel>("email");
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  function formatPhone(v: string) {
    const digits = v.replace(/\D/g, "");
    if (digits.startsWith("55")) return "+" + digits;
    if (digits.length >= 10) return "+55" + digits;
    return v;
  }

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        toast.success("Verifique seu e-mail para redefinir a senha.");
        setMode("login");
        return;
      }

      if (channel === "email") {
        if (mode === "signup") {
          const { error } = await supabase.auth.signUp({
            email,
            password: senha,
            options: {
              emailRedirectTo: window.location.origin,
              data: { nome },
            },
          });
          if (error) throw error;
          toast.success("Conta criada! 15 dias Premium liberados.");
          navigate({ to: "/" });
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
          if (error) throw error;
          navigate({ to: "/" });
        }
      } else {
        // telefone — OTP
        const phone = formatPhone(telefone);
        if (!otpSent) {
          const { error } = await supabase.auth.signInWithOtp({ phone });
          if (error) throw error;
          setOtpSent(true);
          toast.success("Código enviado por SMS.");
        } else {
          const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
          if (error) throw error;
          navigate({ to: "/" });
        }
      }
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : "Erro";
      toast.error(m.includes("provider is not enabled") ? "Login por SMS ainda não está ativo neste app. Use e-mail." : m);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
  <div className="mb-4 flex justify-center">
  <img
    src="/login-logo.png"
    alt="Logo"
    className="w-24 h-24 object-contain"
  />
</div>

  <h1 className="text-2xl font-bold">Entrega Pro</h1>
  <p className="text-sm text-muted-foreground mt-1">
    {mode === "login" && "Entre na sua conta"}
    {mode === "signup" && "Crie sua conta — 15 dias Premium grátis"}
    {mode === "reset" && "Recupere seu acesso"}
  </p>
</div>

          {mode !== "reset" && (
            <div className="grid grid-cols-2 gap-2 mb-5 p-1 rounded-lg bg-secondary/50">
              <button
                type="button"
                onClick={() => { setChannel("email"); setOtpSent(false); }}
                className={`h-9 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition ${channel === "email" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                <Mail className="size-4" /> E-mail
              </button>
              <button
                type="button"
                onClick={() => { setChannel("telefone"); setOtpSent(false); }}
                className={`h-9 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition ${channel === "telefone" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                <Phone className="size-4" /> Telefone
              </button>
            </div>
          )}

          <form onSubmit={handle} className="ep-card space-y-3">
            {mode === "signup" && (
              <Field icon={<User className="size-4" />} label="Nome">
                <input
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="ep-input"
                  placeholder="Seu nome"
                />
              </Field>
            )}

            {(channel === "email" || mode === "reset") && (
              <Field icon={<Mail className="size-4" />} label="E-mail">
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ep-input"
                  placeholder="voce@exemplo.com"
                />
              </Field>
            )}

            {channel === "telefone" && mode !== "reset" && (
              <Field icon={<Phone className="size-4" />} label="Telefone (com DDD)">
                <input
                  required
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="ep-input"
                  placeholder="11999998888"
                />
              </Field>
            )}

            {channel === "email" && mode !== "reset" && (
              <Field icon={<Lock className="size-4" />} label="Senha">
                <input
                  required
                  type="password"
                  minLength={6}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="ep-input"
                  placeholder="mín. 6 caracteres"
                />
              </Field>
            )}

            {channel === "telefone" && otpSent && (
              <Field icon={<Lock className="size-4" />} label="Código recebido por SMS">
                <input
                  required
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="ep-input tracking-widest text-center"
                  placeholder="000000"
                />
              </Field>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 active:scale-[0.99] transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              {mode === "login" && (channel === "telefone" && !otpSent ? "Enviar código" : "Entrar")}
              {mode === "signup" && "Criar conta"}
              {mode === "reset" && "Enviar link"}
              {channel === "telefone" && otpSent && mode === "login" ? " e validar" : ""}
            </button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-2 text-sm">
            {mode !== "login" && (
              <button onClick={() => { setMode("login"); setOtpSent(false); }} className="text-primary">
                Já tenho conta
              </button>
            )}
            {mode !== "signup" && (
              <button onClick={() => { setMode("signup"); setOtpSent(false); }} className="text-muted-foreground">
                Criar nova conta
              </button>
            )}
            {mode === "login" && channel === "email" && (
              <button onClick={() => setMode("reset")} className="text-muted-foreground">
                Esqueci a senha
              </button>
            )}
          </div>

          {channel === "telefone" && (
            <p className="mt-4 text-[11px] text-muted-foreground text-center px-4">
              O login por SMS depende de um provedor configurado no backend. Se não funcionar, use e-mail.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5 mb-1">
        {icon} {label}
      </span>
      {children}
    </label>
  );
}
