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
      encontros: {
        Row: {
          created_at: string
          fim: string
          google_event_id: string | null
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
          sincronizado_google: boolean
          status: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fim: string
          google_event_id?: string | null
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
          sincronizado_google?: boolean
          status?: string
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fim?: string
          google_event_id?: string | null
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
          sincronizado_google?: boolean
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
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          id: string
          refresh_token: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
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
      mentorados: {
        Row: {
          cidade: string
          created_at: string
          data_inicio: string
          email: string
          id: string
          mentor_id: string | null
          nome: string
          observacoes_gerais: string
          origem: string
          status: string
          tags: string[]
          telefone_whatsapp: string
          updated_at: string
        }
        Insert: {
          cidade?: string
          created_at?: string
          data_inicio?: string
          email?: string
          id?: string
          mentor_id?: string | null
          nome: string
          observacoes_gerais?: string
          origem?: string
          status?: string
          tags?: string[]
          telefone_whatsapp?: string
          updated_at?: string
        }
        Update: {
          cidade?: string
          created_at?: string
          data_inicio?: string
          email?: string
          id?: string
          mentor_id?: string | null
          nome?: string
          observacoes_gerais?: string
          origem?: string
          status?: string
          tags?: string[]
          telefone_whatsapp?: string
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
          google_calendar_connected: boolean
          google_calendar_id: string | null
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
          google_calendar_connected?: boolean
          google_calendar_id?: string | null
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
          google_calendar_connected?: boolean
          google_calendar_id?: string | null
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
      get_user_mentor_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
