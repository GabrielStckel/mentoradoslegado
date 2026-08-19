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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      atividades_log: {
        Row: {
          acao: string
          campo: string | null
          changed_at: string
          changed_by: string | null
          changed_by_nome: string | null
          descricao: string
          enc_contratados: number | null
          enc_realizados: number | null
          entidade: string
          entidade_id: string
          id: string
          mentor_id: string | null
          mentor_nome: string | null
          mentorado_id: string | null
          mentorado_nome: string | null
          snapshot: Json | null
          valor_antigo: string | null
          valor_novo: string | null
        }
        Insert: {
          acao: string
          campo?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_by_nome?: string | null
          descricao?: string
          enc_contratados?: number | null
          enc_realizados?: number | null
          entidade: string
          entidade_id: string
          id?: string
          mentor_id?: string | null
          mentor_nome?: string | null
          mentorado_id?: string | null
          mentorado_nome?: string | null
          snapshot?: Json | null
          valor_antigo?: string | null
          valor_novo?: string | null
        }
        Update: {
          acao?: string
          campo?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_by_nome?: string | null
          descricao?: string
          enc_contratados?: number | null
          enc_realizados?: number | null
          entidade?: string
          entidade_id?: string
          id?: string
          mentor_id?: string | null
          mentor_nome?: string | null
          mentorado_id?: string | null
          mentorado_nome?: string | null
          snapshot?: Json | null
          valor_antigo?: string | null
          valor_novo?: string | null
        }
        Relationships: []
      }
      encontros: {
        Row: {
          created_at: string
          fim: string
          id: string
          inicio: string
          lembrete_10min_enviado: boolean
          lembrete_24h_enviado: boolean
          lembrete_3h_enviado: boolean
          link_reuniao: string
          local: string
          mentor_id: string
          mentorado_id: string
          notas_do_mentor: string
          notas_operacionais: string
          proxima_acao: string
          status: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fim: string
          id?: string
          inicio: string
          lembrete_10min_enviado?: boolean
          lembrete_24h_enviado?: boolean
          lembrete_3h_enviado?: boolean
          link_reuniao?: string
          local?: string
          mentor_id: string
          mentorado_id: string
          notas_do_mentor?: string
          notas_operacionais?: string
          proxima_acao?: string
          status?: string
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fim?: string
          id?: string
          inicio?: string
          lembrete_10min_enviado?: boolean
          lembrete_24h_enviado?: boolean
          lembrete_3h_enviado?: boolean
          link_reuniao?: string
          local?: string
          mentor_id?: string
          mentorado_id?: string
          notas_do_mentor?: string
          notas_operacionais?: string
          proxima_acao?: string
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "encontros_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encontros_mentorado_id_fkey"
            columns: ["mentorado_id"]
            isOneToOne: false
            referencedRelation: "mentorados"
            referencedColumns: ["id"]
          },
        ]
      }
      encontros_audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          encontro_id: string
          field_name: string | null
          id: string
          mentor_id: string | null
          mentorado_id: string | null
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          encontro_id: string
          field_name?: string | null
          id?: string
          mentor_id?: string | null
          mentorado_id?: string | null
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          encontro_id?: string
          field_name?: string | null
          id?: string
          mentor_id?: string | null
          mentorado_id?: string | null
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: []
      }
      especialidades: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      historicos: {
        Row: {
          conteudo: string
          created_at: string
          id: string
          mentor_id: string
          mentorado_id: string
          tipo: string
          visibilidade: string
        }
        Insert: {
          conteudo?: string
          created_at?: string
          id?: string
          mentor_id: string
          mentorado_id: string
          tipo?: string
          visibilidade?: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          id?: string
          mentor_id?: string
          mentorado_id?: string
          tipo?: string
          visibilidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "historicos_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historicos_mentorado_id_fkey"
            columns: ["mentorado_id"]
            isOneToOne: false
            referencedRelation: "mentorados"
            referencedColumns: ["id"]
          },
        ]
      }
      locais: {
        Row: {
          created_at: string
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      mentorados: {
        Row: {
          cidade: string
          created_at: string
          data_inicio: string
          email: string
          encontros_realizados: number
          id: string
          mentor_id: string | null
          nome: string
          observacoes_gerais: string
          origem: string
          status: string
          tags: string[]
          telefone_whatsapp: string
          total_encontros: number
          updated_at: string
        }
        Insert: {
          cidade?: string
          created_at?: string
          data_inicio?: string
          email?: string
          encontros_realizados?: number
          id?: string
          mentor_id?: string | null
          nome: string
          observacoes_gerais?: string
          origem?: string
          status?: string
          tags?: string[]
          telefone_whatsapp?: string
          total_encontros?: number
          updated_at?: string
        }
        Update: {
          cidade?: string
          created_at?: string
          data_inicio?: string
          email?: string
          encontros_realizados?: number
          id?: string
          mentor_id?: string | null
          nome?: string
          observacoes_gerais?: string
          origem?: string
          status?: string
          tags?: string[]
          telefone_whatsapp?: string
          total_encontros?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorados_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentores"
            referencedColumns: ["id"]
          },
        ]
      }
      mentores: {
        Row: {
          carga_max_por_dia: number
          cor_calendario: string
          created_at: string
          email: string
          especialidade: string
          id: string
          nome: string
          status: string
          telefone_whatsapp: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          carga_max_por_dia?: number
          cor_calendario?: string
          created_at?: string
          email: string
          especialidade?: string
          id?: string
          nome: string
          status?: string
          telefone_whatsapp?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          carga_max_por_dia?: number
          cor_calendario?: string
          created_at?: string
          email?: string
          especialidade?: string
          id?: string
          nome?: string
          status?: string
          telefone_whatsapp?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      origens: {
        Row: {
          created_at: string
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      pin_settings: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          pin: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          pin?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          pin?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      status_mentorado: {
        Row: {
          cor: string
          created_at: string
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          cor?: string
          created_at?: string
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      audit_actor_nome: { Args: never; Returns: string }
      excluir_mentorado: {
        Args: { p_mentorado_id: string; p_motivo?: string }
        Returns: undefined
      }
      get_user_mentor_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      registrar_encontro_realizado: {
        Args: { p_delta: number; p_mentorado_id: string; p_obs?: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "mentor" | "operacao"
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
      app_role: ["admin", "mentor", "operacao"],
    },
  },
} as const
