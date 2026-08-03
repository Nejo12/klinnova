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
      applications: {
        Row: {
          candidate_id: string
          candidate_snapshot: Json
          created_at: string
          id: string
          snapshot_version: number
          status: string
          submitted_at: string
          updated_at: string
          vacancy_id: string
          vacancy_snapshot: Json
        }
        Insert: {
          candidate_id: string
          candidate_snapshot: Json
          created_at?: string
          id?: string
          snapshot_version: number
          status: string
          submitted_at?: string
          updated_at?: string
          vacancy_id: string
          vacancy_snapshot: Json
        }
        Update: {
          candidate_id?: string
          candidate_snapshot?: Json
          created_at?: string
          id?: string
          snapshot_version?: number
          status?: string
          submitted_at?: string
          updated_at?: string
          vacancy_id?: string
          vacancy_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_languages: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          language_code: string
          proficiency: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          language_code: string
          proficiency: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          language_code?: string
          proficiency?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_languages_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_profiles: {
        Row: {
          available_from: string | null
          city: string | null
          created_at: string
          display_name: string
          employment_types: string[]
          german_comfort: string | null
          id: string
          job_categories: string[]
          onboarding_completed_at: string | null
          shift_preferences: string[]
          travel_radius_minutes: number | null
          updated_at: string
          work_authorisation_declared: boolean | null
          work_authorisation_declared_at: string | null
        }
        Insert: {
          available_from?: string | null
          city?: string | null
          created_at?: string
          display_name: string
          employment_types?: string[]
          german_comfort?: string | null
          id: string
          job_categories?: string[]
          onboarding_completed_at?: string | null
          shift_preferences?: string[]
          travel_radius_minutes?: number | null
          updated_at?: string
          work_authorisation_declared?: boolean | null
          work_authorisation_declared_at?: string | null
        }
        Update: {
          available_from?: string | null
          city?: string | null
          created_at?: string
          display_name?: string
          employment_types?: string[]
          german_comfort?: string | null
          id?: string
          job_categories?: string[]
          onboarding_completed_at?: string | null
          shift_preferences?: string[]
          travel_radius_minutes?: number | null
          updated_at?: string
          work_authorisation_declared?: boolean | null
          work_authorisation_declared_at?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_employer_id: string | null
          slug: string
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_employer_id?: string | null
          slug: string
          source: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_employer_id?: string | null
          slug?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_owner_employer_id_fkey"
            columns: ["owner_employer_id"]
            isOneToOne: false
            referencedRelation: "employer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_profiles: {
        Row: {
          berlin_locality: string | null
          created_at: string
          display_name: string | null
          employer_type: string
          id: string
          lawful_hiring_declared: boolean | null
          lawful_hiring_declared_at: string | null
          onboarding_completed_at: string | null
          organisation_legal_name: string | null
          phone: string | null
          updated_at: string
          verification_state: string
          website: string | null
        }
        Insert: {
          berlin_locality?: string | null
          created_at?: string
          display_name?: string | null
          employer_type: string
          id: string
          lawful_hiring_declared?: boolean | null
          lawful_hiring_declared_at?: string | null
          onboarding_completed_at?: string | null
          organisation_legal_name?: string | null
          phone?: string | null
          updated_at?: string
          verification_state?: string
          website?: string | null
        }
        Update: {
          berlin_locality?: string | null
          created_at?: string
          display_name?: string | null
          employer_type?: string
          id?: string
          lawful_hiring_declared?: boolean | null
          lawful_hiring_declared_at?: string | null
          onboarding_completed_at?: string | null
          organisation_legal_name?: string | null
          phone?: string | null
          updated_at?: string
          verification_state?: string
          website?: string | null
        }
        Relationships: []
      }
      vacancies: {
        Row: {
          available_from: string | null
          city: string
          company_id: string
          created_at: string
          employment_types: string[]
          expires_at: string
          german_requirement: string
          id: string
          job_category: string
          publication_state: string
          published_at: string | null
          shift_requirements: string[]
          slug: string
          source: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          available_from?: string | null
          city: string
          company_id: string
          created_at?: string
          employment_types: string[]
          expires_at: string
          german_requirement: string
          id?: string
          job_category: string
          publication_state: string
          published_at?: string | null
          shift_requirements: string[]
          slug: string
          source: string
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          available_from?: string | null
          city?: string
          company_id?: string
          created_at?: string
          employment_types?: string[]
          expires_at?: string
          german_requirement?: string
          id?: string
          job_category?: string
          publication_state?: string
          published_at?: string | null
          shift_requirements?: string[]
          slug?: string
          source?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacancies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vacancy_language_requirements: {
        Row: {
          created_at: string
          id: string
          language_code: string
          min_proficiency: string
          updated_at: string
          vacancy_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language_code: string
          min_proficiency: string
          updated_at?: string
          vacancy_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language_code?: string
          min_proficiency?: string
          updated_at?: string
          vacancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacancy_language_requirements_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _candidate_first_incomplete_group: {
        Args: { p_uid: string }
        Returns: string
      }
      _clear_completion_for_two_candidates: {
        Args: { p_a: string; p_b: string }
        Returns: undefined
      }
      _clear_completion_if_incomplete: {
        Args: { p_uid: string }
        Returns: undefined
      }
      _clear_employer_completion_if_incomplete: {
        Args: { p_uid: string }
        Returns: undefined
      }
      _employer_first_incomplete_reason: {
        Args: {
          p_berlin_locality: string
          p_display_name: string
          p_employer_type: string
          p_id: string
          p_lawful_hiring_declared: boolean
          p_organisation_legal_name: string
        }
        Returns: string
      }
      _employer_has_owned_company: {
        Args: { p_employer_id: string }
        Returns: boolean
      }
      _profile_first_incomplete_group: {
        Args: {
          p_available_from: string
          p_candidate_id: string
          p_city: string
          p_employment_types: string[]
          p_german_comfort: string
          p_job_categories: string[]
          p_shift_preferences: string[]
          p_travel_radius_minutes: number
          p_work_authorisation_declared: boolean
        }
        Returns: string
      }
      bootstrap_organisation_employer: {
        Args: {
          p_berlin_locality: string
          p_company_name: string
          p_company_slug: string
          p_display_name: string
          p_organisation_legal_name: string
          p_phone?: string
          p_website?: string
        }
        Returns: Json
      }
      complete_candidate_onboarding: { Args: never; Returns: Json }
      complete_employer_onboarding: { Args: never; Returns: Json }
      submit_candidate_application: {
        Args: { p_vacancy_id: string }
        Returns: Json
      }
      text_array_is_unique: { Args: { input: string[] }; Returns: boolean }
      visible_seed_company_ids: { Args: never; Returns: string[] }
      visible_seed_vacancy_ids: { Args: never; Returns: string[] }
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
    Enums: {},
  },
} as const

