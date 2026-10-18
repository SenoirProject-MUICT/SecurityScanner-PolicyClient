/**
 * Supabase database types for the public schema in `supabase/schema.sql`.
 *
 * Keep this snapshot in sync with the database schema. Once the Supabase CLI
 * is linked to the project, regenerate it with:
 * `supabase gen types typescript --linked --schema public`
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: { created_at: string; created_by: string | null; id: string; name: string; updated_at: string }
        Insert: { created_at?: string; created_by?: string | null; id?: string; name: string; updated_at?: string }
        Update: { created_at?: string; created_by?: string | null; id?: string; name?: string; updated_at?: string }
        Relationships: []
      }
      workspace_memberships: {
        Row: { created_at: string; display_name: string; email: string | null; id: string; is_default: boolean; role: string; status: string; updated_at: string; user_id: string | null; workspace_id: string }
        Insert: { created_at?: string; display_name?: string; email?: string | null; id?: string; is_default?: boolean; role?: string; status?: string; updated_at?: string; user_id?: string | null; workspace_id: string }
        Update: { created_at?: string; display_name?: string; email?: string | null; id?: string; is_default?: boolean; role?: string; status?: string; updated_at?: string; user_id?: string | null; workspace_id?: string }
        Relationships: []
      }
      workspace_join_codes: {
        Row: { code_hash: string; created_at: string; created_by: string | null; expires_at: string; id: string; revoked_at: string | null; workspace_id: string }
        Insert: { code_hash: string; created_at?: string; created_by?: string | null; expires_at: string; id?: string; revoked_at?: string | null; workspace_id: string }
        Update: { code_hash?: string; created_at?: string; created_by?: string | null; expires_at?: string; id?: string; revoked_at?: string | null; workspace_id?: string }
        Relationships: []
      }
      policies: {
        Row: {
          created_at: string
          created_by: string
          description: string
          effective_from: string | null
          effective_until: string | null
          id: string
          labels: string[]
          name: string
          owner_id: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          description?: string
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          labels?: string[]
          name: string
          owner_id?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          labels?: string[]
          name?: string
          owner_id?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      policy_activity: {
        Row: {
          activity_type: string
          id: string
          occurred_at: string
          owner_id: string
          policy_id: string
          policy_name: string
          workspace_id: string
        }
        Insert: {
          activity_type: string
          id?: string
          occurred_at?: string
          owner_id?: string
          policy_id: string
          policy_name: string
          workspace_id: string
        }
        Update: {
          activity_type?: string
          id?: string
          occurred_at?: string
          owner_id?: string
          policy_id?: string
          policy_name?: string
          workspace_id?: string
        }
        Relationships: []
      }
      policy_labels: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          owner_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          name: string
          owner_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          owner_id?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
