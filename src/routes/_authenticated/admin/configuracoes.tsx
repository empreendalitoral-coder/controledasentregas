import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, CreditCard, BadgeDollarSign, MessageSquare, LoaderCircle, TriangleAlert } from "lucide-react";
import { Field } from "@/components/Field";
import { Button } from "@/components/ui/button";

type Config = {
  nome_recebedor: string;
  chave_pix: string;
  tipo_chave_pix: "cpf" | "cnpj" | "telefone" | "email" | "aleatoria";
  valor_mensal: number;
  valor_anual: number;
  dias_teste_gratis: number;
  mensagem_pagamento: string;
  whatsapp_suporte: string | null;
};

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Admin — Entrega Pro" },
      { name: "description", content: "Configurações gerais do Entrega Pro, planos e valores do Premium." },
      { property: "og:title", content: "Configurações — Admin — Entrega Pro" },
      { property: "og:description", content: "Configurações gerais do Entrega Pro, planos e valores do Premium." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://meuentregapro.app/admin/configuracoes" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/admin/configuracoes" }],
  }),
  component: ConfigAdminPage,
});

function ConfigAdminPage() {
  const [c, setC] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("configuracoes").select("*").eq("id", 1).maybeSingle().then(({ data, error: loadError }) => {
      setLoading(false);
      if (loadError || !data) { setError("Não foi possível carregar as configurações."); return; }
      if (data) setC({
        nome_recebedor: data.nome_recebedor,
        chave_pix: data.chave_pix,
        tipo_chave_pix: data.tipo_chave_pix as Config["tipo_chave_pix"],
        valor_mensal: Number(data.valor_mensal),
        valor_anual: Number(data.valor_anual),
        dias_teste_gratis: data.dias_teste_gratis,
        mensagem_pagamento: data.mensagem_pagamento,
        whatsapp_suporte: data.whatsapp_suporte,
      });
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!c) return;
    setSaving(true);
    const { error } = await supabase.from("configuracoes").update(c).eq("id", 1);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas — aplica para todos os usuários");
  }

  if (loading) return <div className="ep-empty"><LoaderCircle className="size-6 animate-spin text-primary" /><span className="mt-2 text-sm">Carregando configurações…</span></div>;
  if (error || !c) return <div className="ep-empty"><TriangleAlert className="size-6 text-warning" /><span className="mt-2 text-sm">{error || "Configuração indisponível."}</span></div>;

  return (
    <form onSubmit={save} className="space-y-4">
      <section className="ep-card space-y-3">
      <div className="flex items-center gap-2"><div className="ep-icon-chip"><CreditCard className="size-4" /></div><div><h3 className="font-semibold">Recebimento via PIX</h3><p className="text-xs text-muted-foreground">Dados exibidos no pagamento.</p></div></div>
      <Field label="Nome do recebedor">
        <input className="ep-input" value={c.nome_recebedor} onChange={(e) => setC({ ...c, nome_recebedor: e.target.value })} />
      </Field>
      <Field label="Tipo de chave PIX">
        <select className="ep-input" value={c.tipo_chave_pix} onChange={(e) => setC({ ...c, tipo_chave_pix: e.target.value as Config["tipo_chave_pix"] })}>
          <option value="cpf">CPF</option>
          <option value="cnpj">CNPJ</option>
          <option value="telefone">Telefone</option>
          <option value="email">E-mail</option>
          <option value="aleatoria">Aleatória</option>
        </select>
      </Field>
      <Field label="Chave PIX">
        <input className="ep-input" value={c.chave_pix} onChange={(e) => setC({ ...c, chave_pix: e.target.value })} />
      </Field>
      </section>
      <section className="ep-card space-y-3">
      <div className="flex items-center gap-2"><div className="ep-icon-chip"><BadgeDollarSign className="size-4" /></div><div><h3 className="font-semibold">Valores dos planos</h3><p className="text-xs text-muted-foreground">Preços e período de teste.</p></div></div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Mensal (R$)">
          <input className="ep-input" type="number" step="0.01" value={c.valor_mensal} onChange={(e) => setC({ ...c, valor_mensal: Number(e.target.value) })} />
        </Field>
        <Field label="Anual (R$)">
          <input className="ep-input" type="number" step="0.01" value={c.valor_anual} onChange={(e) => setC({ ...c, valor_anual: Number(e.target.value) })} />
        </Field>
      </div>
      <Field label="Dias de teste grátis (novos cadastros)">
        <input className="ep-input" type="number" value={c.dias_teste_gratis} onChange={(e) => setC({ ...c, dias_teste_gratis: Number(e.target.value) })} />
      </Field>
      </section>
      <section className="ep-card space-y-3">
      <div className="flex items-center gap-2"><div className="ep-icon-chip"><MessageSquare className="size-4" /></div><div><h3 className="font-semibold">Comunicação</h3><p className="text-xs text-muted-foreground">Mensagem de pagamento e suporte.</p></div></div>
      <Field label="Mensagem na tela de pagamento">
        <textarea className="ep-input min-h-24 py-2" value={c.mensagem_pagamento} onChange={(e) => setC({ ...c, mensagem_pagamento: e.target.value })} />
      </Field>
      <Field label="WhatsApp suporte (opcional)">
        <input className="ep-input" value={c.whatsapp_suporte || ""} onChange={(e) => setC({ ...c, whatsapp_suporte: e.target.value })} placeholder="11999999999" />
      </Field>
      </section>
      <Button type="submit" disabled={saving} className="w-full h-12">
        <Save className="size-4" /> {saving ? "Salvando..." : "Salvar configurações"}
      </Button>
    </form>
  );
}
