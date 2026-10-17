export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      analyses: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          repository: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          repository: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          repository?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      explanations: {
        Row: {
          analysis_id: string
          body: string
          cache_key: string
          created_at: string
          id: string
          inferred_role: string | null
          kind: string
          model: string
          organization_id: string
          prompt_version: number
          subject: string
        }
        ComputedFields: never
        Insert: {
          analysis_id: string
          body: string
          cache_key: string
          created_at?: string
          id?: string
          inferred_role?: string | null
          kind: string
          model: string
          organization_id: string
          prompt_version: number
          subject: string
        }
        Update: {
          analysis_id?: string
          body?: string
          cache_key?: string
          created_at?: string
          id?: string
          inferred_role?: string | null
          kind?: string
          model?: string
          organization_id?: string
          prompt_version?: number
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "explanations_organization_id_analysis_id_fkey"
            columns: ["organization_id", "analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "explanations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      results: {
        Row: {
          analysis_id: string
          commit: string
          detection: NonNullable<Json>
          organization_id: string
          parsed: NonNullable<Json>
          stored_at: string
        }
        ComputedFields: never
        Insert: {
          analysis_id: string
          commit: string
          detection: NonNullable<Json>
          organization_id: string
          parsed: NonNullable<Json>
          stored_at?: string
        }
        Update: {
          analysis_id?: string
          commit?: string
          detection?: NonNullable<Json>
          organization_id?: string
          parsed?: NonNullable<Json>
          stored_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_organization_id_analysis_id_fkey"
            columns: ["organization_id", "analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      runs: {
        Row: {
          analysis_id: string
          commit: string | null
          failed_stage: string | null
          finished_at: string | null
          id: string
          message: string
          organization_id: string
          started_at: string
          state: string
          stale: boolean | null
        }
        ComputedFields: "stale"
        Insert: {
          analysis_id: string
          commit?: string | null
          failed_stage?: string | null
          finished_at?: string | null
          id?: string
          message?: string
          organization_id: string
          started_at?: string
          state: string
        }
        Update: {
          analysis_id?: string
          commit?: string | null
          failed_stage?: string | null
          finished_at?: string | null
          id?: string
          message?: string
          organization_id?: string
          started_at?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "runs_organization_id_analysis_id_fkey"
            columns: ["organization_id", "analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_run: {
        Args: { commit?: string; message: string; run: string; stage: string }
        Returns: boolean
      }
      fail_run: { Args: { message: string; run: string }; Returns: undefined }
      finish_run: {
        Args: { detection: Json; message: string; parsed: Json; run: string }
        Returns: boolean
      }
      rerun_analysis: {
        Args: {
          analysis: string
          message: string
          organization: string
          stopped: string
        }
        Returns: {
          run_id: string
          started: boolean
        }[]
      }
      stale: {
        Args: {
          run: Omit<
            Database["public"]["Tables"]["runs"]["Row"],
            Database["public"]["Tables"]["runs"]["ComputedFields"]
          >
        }
        Returns: boolean
      }
      start_analysis: {
        Args: { message: string; organization: string; repository: string }
        Returns: {
          analysis_id: string
          run_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
