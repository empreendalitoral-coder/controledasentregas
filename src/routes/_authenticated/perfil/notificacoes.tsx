import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import {
  listNotificationSettings,
  updateNotificationPreference,
  removeDeviceById,
} from "@/lib/notifications/send.functions";
import { toast } from "sonner";
import { Bell, Smartphone, Trash2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/perfil/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — Entrega Pro" },
      { name: "description", content: "Escolha quais notificações receber e gerencie seus dispositivos." },
    ],
  }),
  component: NotifPrefsPage,
});

const CATEGORIA_LABEL: Record<string, string> = {
  operacional: "Operacional",
  financeiro: "Financeiro",
  premium: "Premium",
  admin: "Administração",
  resumo: "Resumos",
};

function NotifPrefsPage() {
  const load = useServerFn(listNotificationSettings);
  const update = useServerFn(updateNotificationPreference);
  const removeDev = useServerFn(removeDeviceById);
  const router = useRouter();

  const q = useQuery({
    queryKey: ["notif-settings"],
    queryFn: () => load(),
  });

  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(codigo: string, ativo: boolean) {
    setBusy(codigo);
    try {
      await update({ data: { tipo_codigo: codigo, ativo } });
      await q.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setBusy(null);
    }
  }

  async function removerDispositivo(id: string) {
    if (!confirm("Remover este dispositivo? Ele deixará de receber notificações.")) return;
    setBusy(id);
    try {
      await removeDev({ data: { id } });
      await q.refetch();
      toast.success("Dispositivo removido");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setBusy(null);
    }
  }

  const grupos = new Map<string, Array<NonNullable<typeof q.data>["tipos"][number]>>();
  for (const t of q.data?.tipos ?? []) {
    const arr = grupos.get(t.categoria) ?? [];
    arr.push(t);
    grupos.set(t.categoria, arr);
  }

  return (
    <AppShell title="Notificações" back="/perfil">
      <div className="space-y-4">
        <div className="ep-card">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="size-5 text-primary" />
            <h2 className="font-semibold">Preferências</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Ative apenas as notificações que você quer receber. Você pode alterar a qualquer momento.
          </p>
        </div>

        {q.isLoading && <div className="text-center text-sm text-muted-foreground py-6">Carregando…</div>}

        {[...grupos.entries()].map(([cat, tipos]) => (
          <div key={cat} className="ep-card">
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-3">
              {CATEGORIA_LABEL[cat] ?? cat}
            </div>
            <ul className="space-y-3">
              {tipos.map((t) => (
                <li key={t.codigo} className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{t.titulo}</div>
                    <div className="text-xs text-muted-foreground">{t.descricao}</div>
                  </div>
                  <button
                    disabled={busy === t.codigo}
                    onClick={() => toggle(t.codigo, !t.ativo)}
                    className={`shrink-0 w-11 h-6 rounded-full relative transition-colors ${
                      t.ativo ? "bg-primary" : "bg-secondary"
                    } disabled:opacity-50`}
                    aria-label={t.ativo ? "Desativar" : "Ativar"}
                  >
                    <span
                      className={`absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform ${
                        t.ativo ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="ep-card">
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="size-5 text-primary" />
            <h2 className="font-semibold">Dispositivos conectados</h2>
          </div>
          {(q.data?.dispositivos ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhum dispositivo registrado ainda. Instale o app pela Play Store e permita notificações para
              começar a receber avisos.
            </p>
          ) : (
            <ul className="space-y-2">
              {q.data!.dispositivos.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <div className="text-sm font-medium capitalize">{d.plataforma}</div>
                    <div className="text-xs text-muted-foreground">
                      Último uso: {new Date(d.ultimo_uso).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <button
                    disabled={busy === d.id}
                    onClick={() => removerDispositivo(d.id)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-md disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={() => router.navigate({ to: "/perfil" })}
          className="w-full h-11 rounded-lg bg-secondary text-foreground font-medium"
        >
          Voltar
        </button>
      </div>
    </AppShell>
  );
}
