import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PremiumStatus = {
  loading: boolean;
  ativo: boolean;
  plano: "teste" | "mensal" | "anual" | null;
  dataValidade: Date | null;
  diasRestantes: number;
};

export type CommunityAccessStatus = {
  loading: boolean;
  premiumRequired: boolean;
  hasAccess: boolean;
  isAdmin: boolean;
  premiumValid: boolean;
  transitionDaysRemaining: number;
  transitionEndsAt: Date | null;
};

export function usePremium(): PremiumStatus {
  const [s, set] = useState<PremiumStatus>({
    loading: true, ativo: false, plano: null, dataValidade: null, diasRestantes: 0,
  });
  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { if (alive) set({ loading: false, ativo: false, plano: null, dataValidade: null, diasRestantes: 0 }); return; }
      const { data } = await supabase
        .from("usuarios_premium")
        .select("plano, ativo, data_validade")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (!alive) return;
      if (!data) { set({ loading: false, ativo: false, plano: null, dataValidade: null, diasRestantes: 0 }); return; }
      const valid = new Date(data.data_validade);
      const ativo = data.ativo && valid.getTime() >= Date.now();
      const dias = Math.max(0, Math.ceil((valid.getTime() - Date.now()) / 86400000));
      set({ loading: false, ativo, plano: data.plano as PremiumStatus["plano"], dataValidade: valid, diasRestantes: dias });
    }
    load();
    return () => { alive = false; };
  }, []);
  return s;
}

export function useIsAdmin() {
  const [admin, set] = useState<{ loading: boolean; isAdmin: boolean }>({ loading: true, isAdmin: false });
  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { if (alive) set({ loading: false, isAdmin: false }); return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (alive) set({ loading: false, isAdmin: !!data });
    }
    load();
    return () => { alive = false; };
  }, []);
  return admin;
}

export function useCommunityAccess(): CommunityAccessStatus {
  const [status, setStatus] = useState<CommunityAccessStatus>({
    loading: true,
    premiumRequired: false,
    hasAccess: true,
    isAdmin: false,
    premiumValid: false,
    transitionDaysRemaining: 0,
    transitionEndsAt: null,
  });

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data, error } = await supabase.rpc("get_community_access_status");
      if (!alive) return;
      const row = data?.[0];
      if (error || !row) {
        setStatus((current) => ({ ...current, loading: false }));
        return;
      }
      setStatus({
        loading: false,
        premiumRequired: row.premium_required,
        hasAccess: row.has_access,
        isAdmin: row.is_admin,
        premiumValid: row.premium_valid,
        transitionDaysRemaining: row.transition_days_remaining,
        transitionEndsAt: row.transition_ends_at ? new Date(row.transition_ends_at) : null,
      });
    }
    void load();
    return () => { alive = false; };
  }, []);

  return status;
}
