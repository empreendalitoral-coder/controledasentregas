export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abastecimentos: {
        Row: {
          created_at: string
          data: string
          id: string
          km: number | null
          litros: number
          observacao: string | null
          posto: string | null
          user_id: string
          valor_total: number
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          km?: number | null
          litros: number
          observacao?: string | null
          posto?: string | null
          user_id: string
          valor_total: number
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          km?: number | null
          litros?: number
          observacao?: string | null
          posto?: string | null
          user_id?: string
          valor_total?: number
        }
        Relationships: []
      }
      administradores: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cartao_lancamentos: {
        Row: {
          cartao_id: string
          categoria: string | null
          created_at: string
          data_compra: string
          descricao: string
          id: string
          parcelas: number
          user_id: string
          valor_total: number
        }
        Insert: {
          cartao_id: string
          categoria?: string | null
          created_at?: string
          data_compra?: string
          descricao: string
          id?: string
          parcelas?: number
          user_id: string
          valor_total: number
        }
        Update: {
          cartao_id?: string
          categoria?: string | null
          created_at?: string
          data_compra?: string
          descricao?: string
          id?: string
          parcelas?: number
          user_id?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "cartao_lancamentos_cartao_id_fkey"
            columns: ["cartao_id"]
            isOneToOne: false
            referencedRelation: "cartoes_credito"
            referencedColumns: ["id"]
          },
        ]
      }
      cartoes_credito: {
        Row: {
          cor: string | null
          created_at: string
          dia_fechamento: number
          dia_vencimento: number
          id: string
          limite: number
          nome: string
          user_id: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          dia_fechamento?: number
          dia_vencimento?: number
          id?: string
          limite?: number
          nome: string
          user_id: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          dia_fechamento?: number
          dia_vencimento?: number
          id?: string
          limite?: number
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          chave_pix: string
          dias_teste_gratis: number
          id: number
          mensagem_pagamento: string
          nome_recebedor: string
          tipo_chave_pix: Database["public"]["Enums"]["tipo_chave_pix"]
          updated_at: string
          valor_anual: number
          valor_mensal: number
          whatsapp_suporte: string | null
        }
        Insert: {
          chave_pix?: string
          dias_teste_gratis?: number
          id?: number
          mensagem_pagamento?: string
          nome_recebedor?: string
          tipo_chave_pix?: Database["public"]["Enums"]["tipo_chave_pix"]
          updated_at?: string
          valor_anual?: number
          valor_mensal?: number
          whatsapp_suporte?: string | null
        }
        Update: {
          chave_pix?: string
          dias_teste_gratis?: number
          id?: number
          mensagem_pagamento?: string
          nome_recebedor?: string
          tipo_chave_pix?: Database["public"]["Enums"]["tipo_chave_pix"]
          updated_at?: string
          valor_anual?: number
          valor_mensal?: number
          whatsapp_suporte?: string | null
        }
        Relationships: []
      }
      contas_excluidas: {
        Row: {
          created_at: string
          email: string | null
          id: string
          motivo: string | null
          purgada_em: string | null
          purge_em: string
          solicitado_em: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          motivo?: string | null
          purgada_em?: string | null
          purge_em: string
          solicitado_em?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          motivo?: string | null
          purgada_em?: string | null
          purge_em?: string
          solicitado_em?: string
          user_id?: string
        }
        Relationships: []
      }
      contas_fixas: {
        Row: {
          categoria: string | null
          created_at: string
          dia_vencimento: number
          id: string
          mes_referencia: string | null
          nome: string
          pago: boolean
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          dia_vencimento: number
          id?: string
          mes_referencia?: string | null
          nome: string
          pago?: boolean
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string | null
          created_at?: string
          dia_vencimento?: number
          id?: string
          mes_referencia?: string | null
          nome?: string
          pago?: boolean
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      fluxo_caixa: {
        Row: {
          categoria: string
          created_at: string
          data: string
          descricao: string | null
          id: string
          tipo: Database["public"]["Enums"]["tipo_fluxo"]
          user_id: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          data: string
          descricao?: string | null
          id?: string
          tipo: Database["public"]["Enums"]["tipo_fluxo"]
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_fluxo"]
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      lancamentos: {
        Row: {
          cidade: string | null
          created_at: string
          data: string
          gaiola: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          insucessos: number | null
          km_final: number | null
          km_inicial: number | null
          litros: number | null
          observacao: string | null
          pacotes: number | null
          pacotes_perdidos: number | null
          pnr: number | null
          romaneio: string | null
          trabalhou: boolean
          updated_at: string
          user_id: string
          valor_abastecimento: number | null
          valor_dia: number | null
          valor_perdidos: number | null
          valor_pnr: number | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          data: string
          gaiola?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          insucessos?: number | null
          km_final?: number | null
          km_inicial?: number | null
          litros?: number | null
          observacao?: string | null
          pacotes?: number | null
          pacotes_perdidos?: number | null
          pnr?: number | null
          romaneio?: string | null
          trabalhou?: boolean
          updated_at?: string
          user_id: string
          valor_abastecimento?: number | null
          valor_dia?: number | null
          valor_perdidos?: number | null
          valor_pnr?: number | null
        }
        Update: {
          cidade?: string | null
          created_at?: string
          data?: string
          gaiola?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          insucessos?: number | null
          km_final?: number | null
          km_inicial?: number | null
          litros?: number | null
          observacao?: string | null
          pacotes?: number | null
          pacotes_perdidos?: number | null
          pnr?: number | null
          romaneio?: string | null
          trabalhou?: boolean
          updated_at?: string
          user_id?: string
          valor_abastecimento?: number | null
          valor_dia?: number | null
          valor_perdidos?: number | null
          valor_pnr?: number | null
        }
        Relationships: []
      }
      logs_admin: {
        Row: {
          acao: string
          data_hora: string
          detalhes: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          acao: string
          data_hora?: string
          detalhes?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          data_hora?: string
          detalhes?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      manutencoes: {
        Row: {
          created_at: string
          data: string
          id: string
          km: number | null
          observacao: string | null
          tipo: Database["public"]["Enums"]["tipo_manutencao"]
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          km?: number | null
          observacao?: string | null
          tipo: Database["public"]["Enums"]["tipo_manutencao"]
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          km?: number | null
          observacao?: string | null
          tipo?: Database["public"]["Enums"]["tipo_manutencao"]
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      metas_financeiras: {
        Row: {
          created_at: string
          icone: string | null
          id: string
          nome: string
          prazo: string | null
          updated_at: string
          user_id: string
          valor_atual: number
          valor_meta: number
        }
        Insert: {
          created_at?: string
          icone?: string | null
          id?: string
          nome: string
          prazo?: string | null
          updated_at?: string
          user_id: string
          valor_atual?: number
          valor_meta: number
        }
        Update: {
          created_at?: string
          icone?: string | null
          id?: string
          nome?: string
          prazo?: string | null
          updated_at?: string
          user_id?: string
          valor_atual?: number
          valor_meta?: number
        }
        Relationships: []
      }
      pix_enviados: {
        Row: {
          created_at: string
          data: string
          descricao: string | null
          destinatario: string | null
          id: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data: string
          descricao?: string | null
          destinatario?: string | null
          id?: string
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string | null
          destinatario?: string | null
          id?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      pix_recebidos: {
        Row: {
          created_at: string
          data: string
          descricao: string | null
          id: string
          pagador: string | null
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data: string
          descricao?: string | null
          id?: string
          pagador?: string | null
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          pagador?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          excluida_em: string | null
          foto: string | null
          id: string
          meta_mensal: number
          modelo: string | null
          nome: string
          placa: string | null
          telefone: string | null
          transportadora: string | null
          updated_at: string
          veiculo: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          excluida_em?: string | null
          foto?: string | null
          id: string
          meta_mensal?: number
          modelo?: string | null
          nome?: string
          placa?: string | null
          telefone?: string | null
          transportadora?: string | null
          updated_at?: string
          veiculo?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          excluida_em?: string | null
          foto?: string | null
          id?: string
          meta_mensal?: number
          modelo?: string | null
          nome?: string
          placa?: string | null
          telefone?: string | null
          transportadora?: string | null
          updated_at?: string
          veiculo?: string | null
        }
        Relationships: []
      }
      recebimentos: {
        Row: {
          created_at: string
          data_final: string
          data_inicial: string
          data_pagamento: string
          data_recebimento: string | null
          id: string
          nome_periodo: string
          observacao: string | null
          status: Database["public"]["Enums"]["status_recebimento"]
          updated_at: string
          user_id: string
          valor_recebido: number | null
        }
        Insert: {
          created_at?: string
          data_final: string
          data_inicial: string
          data_pagamento: string
          data_recebimento?: string | null
          id?: string
          nome_periodo: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_recebimento"]
          updated_at?: string
          user_id: string
          valor_recebido?: number | null
        }
        Update: {
          created_at?: string
          data_final?: string
          data_inicial?: string
          data_pagamento?: string
          data_recebimento?: string | null
          id?: string
          nome_periodo?: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_recebimento"]
          updated_at?: string
          user_id?: string
          valor_recebido?: number | null
        }
        Relationships: []
      }
      solicitacoes_premium: {
        Row: {
          comprovante_path: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          observacao_admin: string | null
          plano: Database["public"]["Enums"]["plano_premium"]
          status: Database["public"]["Enums"]["status_solicitacao"]
          telefone: string | null
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          comprovante_path?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          observacao_admin?: string | null
          plano: Database["public"]["Enums"]["plano_premium"]
          status?: Database["public"]["Enums"]["status_solicitacao"]
          telefone?: string | null
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          comprovante_path?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          observacao_admin?: string | null
          plano?: Database["public"]["Enums"]["plano_premium"]
          status?: Database["public"]["Enums"]["status_solicitacao"]
          telefone?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios_premium: {
        Row: {
          ativo: boolean
          created_at: string
          data_inicio: string
          data_validade: string
          plano: Database["public"]["Enums"]["plano_premium"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_inicio?: string
          data_validade?: string
          plano?: Database["public"]["Enums"]["plano_premium"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_inicio?: string
          data_validade?: string
          plano?: Database["public"]["Enums"]["plano_premium"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancelar_exclusao_conta: { Args: never; Returns: undefined }
      get_payment_info: {
        Args: never
        Returns: {
          chave_pix: string
          dias_teste_gratis: number
          mensagem_pagamento: string
          nome_recebedor: string
          tipo_chave_pix: string
          valor_anual: number
          valor_mensal: number
        }[]
      }
      registrar_acesso_nao_autorizado: {
        Args: { _detalhes?: Json }
        Returns: undefined
      }
      solicitar_exclusao_conta: { Args: { _motivo?: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
      plano_premium: "teste" | "mensal" | "anual"
      status_recebimento: "pendente" | "recebido"
      status_solicitacao: "pendente" | "aprovado" | "recusado"
      tipo_chave_pix: "cpf" | "cnpj" | "telefone" | "email" | "aleatoria"
      tipo_fluxo: "entrada" | "saida"
      tipo_manutencao:
        | "Troca de óleo"
        | "Pneus"
        | "Freios"
        | "Suspensão"
        | "Lavagem"
        | "Mecânica"
        | "Outros"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      plano_premium: ["teste", "mensal", "anual"],
      status_recebimento: ["pendente", "recebido"],
      status_solicitacao: ["pendente", "aprovado", "recusado"],
      tipo_chave_pix: ["cpf", "cnpj", "telefone", "email", "aleatoria"],
      tipo_fluxo: ["entrada", "saida"],
      tipo_manutencao: [
        "Troca de óleo",
        "Pneus",
        "Freios",
        "Suspensão",
        "Lavagem",
        "Mecânica",
        "Outros",
      ],
    },
  },
} as const
