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
      admin_audit_events: {
        Row: {
          actor_user_id: string
          event_type: string
          id: string
          occurred_at: string
          reason: string | null
          target_id: string
          target_kind: string
        }
        Insert: {
          actor_user_id: string
          event_type: string
          id?: string
          occurred_at?: string
          reason?: string | null
          target_id: string
          target_kind: string
        }
        Update: {
          actor_user_id?: string
          event_type?: string
          id?: string
          occurred_at?: string
          reason?: string | null
          target_id?: string
          target_kind?: string
        }
        Relationships: []
      }
      application_outcome_events: {
        Row: {
          application_id: string
          id: string
          occurred_at: string
          outcome_type: string
          recorded_at: string
          recorded_by: string
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          application_id: string
          id?: string
          occurred_at: string
          outcome_type: string
          recorded_at?: string
          recorded_by: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          application_id?: string
          id?: string
          occurred_at?: string
          outcome_type?: string
          recorded_at?: string
          recorded_by?: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_outcome_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_status_history: {
        Row: {
          actor_role: string
          actor_user_id: string
          application_id: string
          from_status: string | null
          id: string
          occurred_at: string
          reason: string | null
          to_status: string
        }
        Insert: {
          actor_role: string
          actor_user_id: string
          application_id: string
          from_status?: string | null
          id?: string
          occurred_at?: string
          reason?: string | null
          to_status: string
        }
        Update: {
          actor_role?: string
          actor_user_id?: string
          application_id?: string
          from_status?: string | null
          id?: string
          occurred_at?: string
          reason?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          candidate_id: string
          candidate_snapshot: Json
          created_at: string
          employer_seen_at: string | null
          id: string
          introduction_text: string | null
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
          employer_seen_at?: string | null
          id?: string
          introduction_text?: string | null
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
          employer_seen_at?: string | null
          id?: string
          introduction_text?: string | null
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
          account_deleted_at: string | null
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
          account_deleted_at?: string | null
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
          account_deleted_at?: string | null
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
      deletion_requests: {
        Row: {
          auth_deleted_at: string | null
          completed_at: string | null
          domain_scrubbed_at: string | null
          failed_at: string | null
          failure_code: string | null
          id: string
          processing_lease_started_at: string | null
          processing_started_at: string | null
          requested_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_deleted_at?: string | null
          completed_at?: string | null
          domain_scrubbed_at?: string | null
          failed_at?: string | null
          failure_code?: string | null
          id?: string
          processing_lease_started_at?: string | null
          processing_started_at?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_deleted_at?: string | null
          completed_at?: string | null
          domain_scrubbed_at?: string | null
          failed_at?: string | null
          failure_code?: string | null
          id?: string
          processing_lease_started_at?: string | null
          processing_started_at?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employer_profiles: {
        Row: {
          account_deleted_at: string | null
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
          verification_attestation_version: string | null
          verification_attested_at: string | null
          verification_requested_at: string | null
          verification_review_reason: string | null
          verification_reviewed_at: string | null
          verification_reviewed_by: string | null
          verification_state: string
          website: string | null
        }
        Insert: {
          account_deleted_at?: string | null
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
          verification_attestation_version?: string | null
          verification_attested_at?: string | null
          verification_requested_at?: string | null
          verification_review_reason?: string | null
          verification_reviewed_at?: string | null
          verification_reviewed_by?: string | null
          verification_state?: string
          website?: string | null
        }
        Update: {
          account_deleted_at?: string | null
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
          verification_attestation_version?: string | null
          verification_attested_at?: string | null
          verification_requested_at?: string | null
          verification_review_reason?: string | null
          verification_reviewed_at?: string | null
          verification_reviewed_by?: string | null
          verification_state?: string
          website?: string | null
        }
        Relationships: []
      }
      employer_suspension: {
        Row: {
          employer_profile_id: string
          suspended_at: string
          suspended_by: string
          suspended_reason: string
          updated_at: string
        }
        Insert: {
          employer_profile_id: string
          suspended_at?: string
          suspended_by: string
          suspended_reason: string
          updated_at?: string
        }
        Update: {
          employer_profile_id?: string
          suspended_at?: string
          suspended_by?: string
          suspended_reason?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employer_suspension_employer_profile_id_fkey"
            columns: ["employer_profile_id"]
            isOneToOne: true
            referencedRelation: "employer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      m5_candidate_cohort_enrollments: {
        Row: {
          candidate_user_id: string
          cohort: string
          created_at: string
          enrolled_at: string
        }
        Insert: {
          candidate_user_id: string
          cohort: string
          created_at?: string
          enrolled_at?: string
        }
        Update: {
          candidate_user_id?: string
          cohort?: string
          created_at?: string
          enrolled_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "m5_candidate_cohort_enrollments_candidate_user_id_fkey"
            columns: ["candidate_user_id"]
            isOneToOne: true
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      m5_vacancy_qualifications: {
        Row: {
          created_at: string
          employer_profile_id: string
          qualified_at: string
          vacancy_id: string
        }
        Insert: {
          created_at?: string
          employer_profile_id: string
          qualified_at: string
          vacancy_id: string
        }
        Update: {
          created_at?: string
          employer_profile_id?: string
          qualified_at?: string
          vacancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "m5_vacancy_qualifications_employer_profile_id_fkey"
            columns: ["employer_profile_id"]
            isOneToOne: false
            referencedRelation: "employer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "m5_vacancy_qualifications_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: true
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          application_id: string
          created_at: string
          id: string
          kind: string
          read_at: string | null
          recipient_user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          kind: string
          read_at?: string | null
          recipient_user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          recipient_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      vacancies: {
        Row: {
          available_from: string | null
          city: string
          company_id: string | null
          created_at: string
          cv_required: boolean | null
          description: string | null
          employer_profile_id: string | null
          employment_types: string[]
          experience_notes: string | null
          expired_at: string | null
          expires_at: string | null
          filled_at: string | null
          german_requirement: string
          id: string
          interview_english_ok: boolean | null
          job_category: string
          paused_at: string | null
          public_locality: string | null
          publication_state: string
          published_at: string | null
          salary_amount_cents: number | null
          salary_currency: string | null
          salary_is_gross: boolean | null
          salary_period: string | null
          shift_requirements: string[]
          slug: string
          source: string
          summary: string
          title: string
          updated_at: string
          withdrawn_at: string | null
          work_frequency: string | null
          workplace_type: string | null
        }
        Insert: {
          available_from?: string | null
          city: string
          company_id?: string | null
          created_at?: string
          cv_required?: boolean | null
          description?: string | null
          employer_profile_id?: string | null
          employment_types: string[]
          experience_notes?: string | null
          expired_at?: string | null
          expires_at?: string | null
          filled_at?: string | null
          german_requirement: string
          id?: string
          interview_english_ok?: boolean | null
          job_category: string
          paused_at?: string | null
          public_locality?: string | null
          publication_state: string
          published_at?: string | null
          salary_amount_cents?: number | null
          salary_currency?: string | null
          salary_is_gross?: boolean | null
          salary_period?: string | null
          shift_requirements: string[]
          slug: string
          source: string
          summary: string
          title: string
          updated_at?: string
          withdrawn_at?: string | null
          work_frequency?: string | null
          workplace_type?: string | null
        }
        Update: {
          available_from?: string | null
          city?: string
          company_id?: string | null
          created_at?: string
          cv_required?: boolean | null
          description?: string | null
          employer_profile_id?: string | null
          employment_types?: string[]
          experience_notes?: string | null
          expired_at?: string | null
          expires_at?: string | null
          filled_at?: string | null
          german_requirement?: string
          id?: string
          interview_english_ok?: boolean | null
          job_category?: string
          paused_at?: string | null
          public_locality?: string | null
          publication_state?: string
          published_at?: string | null
          salary_amount_cents?: number | null
          salary_currency?: string | null
          salary_is_gross?: boolean | null
          salary_period?: string | null
          shift_requirements?: string[]
          slug?: string
          source?: string
          summary?: string
          title?: string
          updated_at?: string
          withdrawn_at?: string | null
          work_frequency?: string | null
          workplace_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vacancies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacancies_employer_profile_id_fkey"
            columns: ["employer_profile_id"]
            isOneToOne: false
            referencedRelation: "employer_profiles"
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
      vacancy_lifecycle_events: {
        Row: {
          actor_user_id: string | null
          event_type: string
          id: string
          metadata: Json
          occurred_at: string
          vacancy_id: string
        }
        Insert: {
          actor_user_id?: string | null
          event_type: string
          id?: string
          metadata?: Json
          occurred_at?: string
          vacancy_id: string
        }
        Update: {
          actor_user_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          vacancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacancy_lifecycle_events_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      vacancy_moderation: {
        Row: {
          moderated_at: string
          moderated_by: string
          moderated_reason: string
          updated_at: string
          vacancy_id: string
        }
        Insert: {
          moderated_at?: string
          moderated_by: string
          moderated_reason: string
          updated_at?: string
          vacancy_id: string
        }
        Update: {
          moderated_at?: string
          moderated_by?: string
          moderated_reason?: string
          updated_at?: string
          vacancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacancy_moderation_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: true
            referencedRelation: "vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_operators: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _anonymize_candidate_domain: {
        Args: { p_candidate_id: string; p_ts: string }
        Returns: undefined
      }
      _anonymize_employer_domain: {
        Args: { p_employer_id: string; p_ts: string }
        Returns: undefined
      }
      _append_admin_audit_event: {
        Args: {
          p_actor_user_id: string
          p_event_type: string
          p_occurred_at: string
          p_reason?: string
          p_target_id: string
          p_target_kind: string
        }
        Returns: string
      }
      _append_vacancy_lifecycle_event: {
        Args: {
          p_actor_user_id: string
          p_event_type: string
          p_metadata?: Json
          p_occurred_at: string
          p_vacancy_id: string
        }
        Returns: string
      }
      _application_allowed_transitions: {
        Args: { p_current_status: string }
        Returns: string[]
      }
      _candidate_first_incomplete_group: {
        Args: { p_uid: string }
        Returns: string
      }
      _claim_deletion_request: { Args: { p_request_id: string }; Returns: Json }
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
      _employer_has_draft_vacancy: {
        Args: { p_employer_id: string }
        Returns: boolean
      }
      _employer_has_employer_vacancy: {
        Args: { p_employer_id: string }
        Returns: boolean
      }
      _employer_has_owned_company: {
        Args: { p_employer_id: string }
        Returns: boolean
      }
      _employer_owned_draft_vacancy: {
        Args: { p_uid: string; p_vacancy_id: string }
        Returns: {
          available_from: string | null
          city: string
          company_id: string | null
          created_at: string
          cv_required: boolean | null
          description: string | null
          employer_profile_id: string | null
          employment_types: string[]
          experience_notes: string | null
          expired_at: string | null
          expires_at: string | null
          filled_at: string | null
          german_requirement: string
          id: string
          interview_english_ok: boolean | null
          job_category: string
          paused_at: string | null
          public_locality: string | null
          publication_state: string
          published_at: string | null
          salary_amount_cents: number | null
          salary_currency: string | null
          salary_is_gross: boolean | null
          salary_period: string | null
          shift_requirements: string[]
          slug: string
          source: string
          summary: string
          title: string
          updated_at: string
          withdrawn_at: string | null
          work_frequency: string | null
          workplace_type: string | null
        }
        SetofOptions: {
          from: "*"
          to: "vacancies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _employer_vacancy_publish_missing: {
        Args: {
          p_at: string
          p_employer: Database["public"]["Tables"]["employer_profiles"]["Row"]
          p_vacancy: Database["public"]["Tables"]["vacancies"]["Row"]
        }
        Returns: string[]
      }
      _evaluate_candidate_vacancy_eligibility: {
        Args: { p_at: string; p_candidate_id: string; p_vacancy_id: string }
        Returns: {
          eligible: boolean
          missing_requirements: string[]
        }[]
      }
      _german_comfort_rank: { Args: { p_level: string }; Returns: number }
      _is_active_verification_operator: {
        Args: { p_uid: string }
        Returns: boolean
      }
      _is_candidate_deleted: {
        Args: { p_candidate_id: string }
        Returns: boolean
      }
      _is_current_candidate_deleted: { Args: never; Returns: boolean }
      _is_current_employer_deleted: { Args: never; Returns: boolean }
      _is_current_employer_suspended: { Args: never; Returns: boolean }
      _is_current_stint_account_deleted: { Args: never; Returns: boolean }
      _is_employer_deleted: {
        Args: { p_employer_profile_id: string }
        Returns: boolean
      }
      _is_employer_suspended: {
        Args: { p_employer_profile_id: string }
        Returns: boolean
      }
      _is_stint_account_deleted: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      _is_vacancy_moderated: {
        Args: { p_vacancy_id: string }
        Returns: boolean
      }
      _language_proficiency_rank: { Args: { p_level: string }; Returns: number }
      _outcome_occurred_at_window_valid: {
        Args: { p_occurred_at: string; p_recorded_at: string }
        Returns: boolean
      }
      _process_deletion_domain_scrub: {
        Args: { p_request_id: string }
        Returns: Json
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
      _reclaim_stale_deletion_request: {
        Args: { p_request_id: string }
        Returns: Json
      }
      _record_deletion_auth_evidence: {
        Args: { p_request_id: string }
        Returns: Json
      }
      _record_deletion_failure: {
        Args: { p_failure_code: string; p_request_id: string }
        Returns: Json
      }
      _record_m5_vacancy_qualification: {
        Args: { p_qualified_at: string; p_vacancy_id: string }
        Returns: boolean
      }
      _slugify_vacancy_title: { Args: { p_title: string }; Returns: string }
      _transition_employer_vacancy: {
        Args: { p_action: string; p_expires_at?: string; p_vacancy_id: string }
        Returns: Json
      }
      _unique_employer_vacancy_slug: {
        Args: { p_title: string }
        Returns: string
      }
      _withdraw_vacancy_for_deletion: {
        Args: {
          p_employer_profile_id: string
          p_ts: string
          p_vacancy_id: string
        }
        Returns: undefined
      }
      approve_employer_verification: {
        Args: { p_employer_profile_id: string }
        Returns: Json
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
      cancel_account_deletion_request: { Args: never; Returns: Json }
      candidate_application_outcomes: {
        Args: { p_application_id: string }
        Returns: {
          occurred_at: string
          outcome_type: string
        }[]
      }
      complete_candidate_onboarding: { Args: never; Returns: Json }
      complete_employer_onboarding: { Args: never; Returns: Json }
      count_unseen_current_employer_applications: { Args: never; Returns: Json }
      create_employer_vacancy_draft: {
        Args: {
          p_available_from?: string
          p_cv_required?: boolean
          p_description?: string
          p_employment_types?: string[]
          p_experience_notes?: string
          p_german_requirement?: string
          p_interview_english_ok?: boolean
          p_job_category: string
          p_public_locality: string
          p_salary_amount_cents?: number
          p_salary_period?: string
          p_shift_requirements?: string[]
          p_summary?: string
          p_title: string
          p_work_frequency?: string
          p_workplace_type?: string
        }
        Returns: Json
      }
      delete_employer_vacancy_draft: {
        Args: { p_vacancy_id: string }
        Returns: Json
      }
      employer_application_outcomes: {
        Args: { p_application_id: string }
        Returns: {
          occurred_at: string
          outcome_event_id: string
          outcome_type: string
          recorded_at: string
          voided_at: string
        }[]
      }
      employer_vacancy_draft_readiness: {
        Args: { p_vacancy_id: string }
        Returns: Json
      }
      employer_vacancy_drafts_readiness: {
        Args: { p_vacancy_ids: string[] }
        Returns: {
          missing: string[]
          ready: boolean
          vacancy_id: string
        }[]
      }
      fill_employer_vacancy: { Args: { p_vacancy_id: string }; Returns: Json }
      get_current_employer_application: {
        Args: { p_application_id: string }
        Returns: Json
      }
      get_m5_founder_metrics: { Args: never; Returns: Json }
      get_effective_public_vacancy: {
        Args: { p_vacancy_id: string }
        Returns: {
          company_name: string
          cv_required: boolean
          description: string
          employer_display_name: string
          employer_type: string
          expires_at: string
          interview_english_ok: boolean
          job_category: string
          public_locality: string
          published_at: string
          source: string
          title: string
          vacancy_id: string
          website: string
          work_frequency: string
          workplace_type: string
        }[]
      }
      get_effective_public_vacancy_languages: {
        Args: { p_vacancy_id: string }
        Returns: {
          language_code: string
          min_proficiency: string
        }[]
      }
      get_employer_moderation_status: {
        Args: { p_employer_profile_id: string }
        Returns: Json
      }
      get_employer_verification_review: {
        Args: { p_employer_profile_id: string }
        Returns: {
          berlin_locality: string
          company_name: string
          display_name: string
          employer_profile_id: string
          employer_type: string
          onboarding_completed: boolean
          verification_attestation_version: string
          verification_attested_at: string
          verification_requested_at: string
          verification_review_reason: string
          verification_reviewed_at: string
          verification_state: string
          website: string
        }[]
      }
      get_vacancy_moderation_status: {
        Args: { p_vacancy_id: string }
        Returns: Json
      }
      is_current_candidate_deleted: { Args: never; Returns: boolean }
      is_current_employer_deleted: { Args: never; Returns: boolean }
      is_current_employer_suspended: { Args: never; Returns: boolean }
      is_current_user_verification_operator: { Args: never; Returns: boolean }
      is_vacancy_effectively_public: {
        Args: { p_at?: string; p_vacancy_id: string }
        Returns: boolean
      }
      list_current_candidate_application_status_history: {
        Args: { p_application_id: string }
        Returns: {
          occurred_at: string
          to_status: string
        }[]
      }
      list_current_candidate_vacancy_matches: {
        Args: never
        Returns: {
          company_name: string
          cv_required: boolean
          description: string
          eligible: boolean
          employer_display_name: string
          employer_type: string
          expires_at: string
          interview_english_ok: boolean
          job_category: string
          missing_requirements: string[]
          public_locality: string
          published_at: string
          source: string
          title: string
          vacancy_id: string
          website: string
          work_frequency: string
          workplace_type: string
        }[]
      }
      list_current_employer_applications: {
        Args: { p_status?: string; p_vacancy_id?: string }
        Returns: {
          application_id: string
          available_from: string
          candidate_deleted: boolean
          candidate_display_name: string
          current_status: string
          employer_seen_at: string
          german_comfort: string
          job_category: string
          submitted_at: string
          updated_at: string
          vacancy_id: string
          vacancy_title: string
        }[]
      }
      list_current_employer_export_applications: {
        Args: never
        Returns: {
          application_id: string
          status: string
          submitted_at: string
          vacancy_id: string
        }[]
      }
      list_current_employer_notifications: {
        Args: never
        Returns: {
          application_id: string
          created_at: string
          kind: string
          notification_id: string
          read_at: string
          vacancy_title: string
        }[]
      }
      list_effective_public_vacancies: {
        Args: never
        Returns: {
          company_name: string
          cv_required: boolean
          description: string
          employer_display_name: string
          employer_type: string
          expires_at: string
          interview_english_ok: boolean
          job_category: string
          public_locality: string
          published_at: string
          source: string
          title: string
          vacancy_id: string
          website: string
          work_frequency: string
          workplace_type: string
        }[]
      }
      list_employer_vacancies_for_operator: {
        Args: {
          p_employer_profile_id: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          moderated: boolean
          moderated_at: string
          publication_state: string
          published_at: string
          title: string
          vacancy_id: string
        }[]
      }
      list_employers_for_operator: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          company_name: string
          created_at: string
          display_name: string
          employer_profile_id: string
          employer_type: string
          onboarding_completed: boolean
          suspended: boolean
          suspended_at: string
          verification_state: string
        }[]
      }
      list_pending_employer_verifications: {
        Args: never
        Returns: {
          company_name: string
          display_name: string
          employer_profile_id: string
          employer_type: string
          onboarding_completed: boolean
          verification_attestation_version: string
          verification_attested_at: string
          verification_requested_at: string
          verification_state: string
          website: string
        }[]
      }
      mark_all_current_employer_notifications_read: {
        Args: never
        Returns: Json
      }
      mark_current_employer_notification_read: {
        Args: { p_notification_id: string }
        Returns: Json
      }
      mark_employer_application_seen: {
        Args: { p_application_id: string }
        Returns: Json
      }
      materialize_employer_vacancy_expiry: {
        Args: { p_vacancy_id: string }
        Returns: Json
      }
      moderate_vacancy: {
        Args: { p_reason: string; p_vacancy_id: string }
        Returns: Json
      }
      pause_employer_vacancy: { Args: { p_vacancy_id: string }; Returns: Json }
      publish_employer_vacancy: {
        Args: { p_expires_at?: string; p_vacancy_id: string }
        Returns: Json
      }
      record_application_outcome: {
        Args: {
          p_application_id: string
          p_occurred_at: string
          p_outcome_type: string
        }
        Returns: Json
      }
      reject_employer_verification: {
        Args: { p_employer_profile_id: string; p_reason: string }
        Returns: Json
      }
      renew_employer_vacancy_to_draft: {
        Args: { p_vacancy_id: string }
        Returns: Json
      }
      replace_employer_vacancy_languages: {
        Args: { p_languages?: Json; p_vacancy_id: string }
        Returns: Json
      }
      request_account_deletion: { Args: never; Returns: Json }
      request_employer_verification: { Args: never; Returns: Json }
      resolve_current_candidate_vacancy_match: {
        Args: { p_vacancy_id: string }
        Returns: {
          eligible: boolean
          missing_requirements: string[]
          status: string
        }[]
      }
      restore_vacancy: { Args: { p_vacancy_id: string }; Returns: Json }
      resume_employer_vacancy: {
        Args: { p_expires_at?: string; p_vacancy_id: string }
        Returns: Json
      }
      revoke_employer_verification: {
        Args: { p_employer_profile_id: string; p_reason: string }
        Returns: Json
      }
      submit_candidate_application: {
        Args: { p_introduction_text?: string; p_vacancy_id: string }
        Returns: Json
      }
      suspend_employer: {
        Args: { p_employer_profile_id: string; p_reason: string }
        Returns: Json
      }
      text_array_is_unique: { Args: { input: string[] }; Returns: boolean }
      transition_current_employer_application_status: {
        Args: {
          p_application_id: string
          p_reason?: string
          p_target_status: string
        }
        Returns: Json
      }
      unsuspend_employer: {
        Args: { p_employer_profile_id: string }
        Returns: Json
      }
      update_employer_vacancy_draft: {
        Args: {
          p_available_from?: string
          p_clear_available_from?: boolean
          p_clear_salary?: boolean
          p_cv_required?: boolean
          p_description?: string
          p_employment_types?: string[]
          p_experience_notes?: string
          p_german_requirement?: string
          p_interview_english_ok?: boolean
          p_job_category?: string
          p_public_locality?: string
          p_salary_amount_cents?: number
          p_salary_period?: string
          p_shift_requirements?: string[]
          p_summary?: string
          p_title?: string
          p_vacancy_id: string
          p_work_frequency?: string
          p_workplace_type?: string
        }
        Returns: Json
      }
      visible_public_vacancy_ids: { Args: { p_at?: string }; Returns: string[] }
      visible_seed_company_ids: { Args: never; Returns: string[] }
      visible_seed_vacancy_ids: { Args: never; Returns: string[] }
      void_application_outcome: {
        Args: { p_outcome_event_id: string }
        Returns: Json
      }
      withdraw_employer_vacancy: {
        Args: { p_vacancy_id: string }
        Returns: Json
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

