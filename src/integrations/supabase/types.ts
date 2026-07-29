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
      admin_activity_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          scope: string
          scope_ref_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          scope?: string
          scope_ref_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          scope?: string
          scope_ref_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_quiz_attempts: {
        Row: {
          answers_json: Json | null
          course_id: string | null
          created_at: string
          id: string
          lesson_id: string | null
          questions_json: Json
          score: number | null
          user_id: string
        }
        Insert: {
          answers_json?: Json | null
          course_id?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          questions_json?: Json
          score?: number | null
          user_id: string
        }
        Update: {
          answers_json?: Json | null
          course_id?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          questions_json?: Json
          score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ai_quiz_reveals: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          quiz_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          quiz_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          quiz_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          content: string
          feedback: string | null
          file_url: string | null
          grade: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          content?: string
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          content?: string
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          created_at: string
          due_at: string | null
          id: string
          instructions: string
          is_ai_generated: boolean
          is_visible: boolean
          lesson_id: string
          max_points: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_at?: string | null
          id?: string
          instructions?: string
          is_ai_generated?: boolean
          is_visible?: boolean
          lesson_id: string
          max_points?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_at?: string | null
          id?: string
          instructions?: string
          is_ai_generated?: boolean
          is_visible?: boolean
          lesson_id?: string
          max_points?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_runs: {
        Row: {
          bytes_uploaded: number | null
          created_at: string
          destination: string | null
          details: Json | null
          error_message: string | null
          finished_at: string | null
          id: string
          started_at: string
          status: string
          tables_backed_up: number | null
          total_rows: number | null
        }
        Insert: {
          bytes_uploaded?: number | null
          created_at?: string
          destination?: string | null
          details?: Json | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          tables_backed_up?: number | null
          total_rows?: number | null
        }
        Update: {
          bytes_uploaded?: number | null
          created_at?: string
          destination?: string | null
          details?: Json | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          tables_backed_up?: number | null
          total_rows?: number | null
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          blocked_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          ip_address: string
          reason: string | null
        }
        Insert: {
          blocked_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: string
          reason?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          author_name: string | null
          category: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          reading_time_minutes: number | null
          related_post_ids: string[] | null
          seo_keywords: string[] | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          related_post_ids?: string[] | null
          seo_keywords?: string[] | null
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          related_post_ids?: string[] | null
          seo_keywords?: string[] | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          course_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      bootcamp_cohorts: {
        Row: {
          allow_flexible_payment: boolean
          cohort_number: number | null
          course_id: string | null
          created_at: string
          default_installments: number
          default_total_amount: number
          description: string | null
          end_date: string
          id: string
          is_active: boolean
          name: string
          slug: string
          start_date: string
          updated_at: string
        }
        Insert: {
          allow_flexible_payment?: boolean
          cohort_number?: number | null
          course_id?: string | null
          created_at?: string
          default_installments?: number
          default_total_amount?: number
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          start_date: string
          updated_at?: string
        }
        Update: {
          allow_flexible_payment?: boolean
          cohort_number?: number | null
          course_id?: string | null
          created_at?: string
          default_installments?: number
          default_total_amount?: number
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bootcamp_cohorts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      bootcamp_enrollments: {
        Row: {
          access_granted: boolean
          amount_paid: number
          cohort_id: string
          created_at: string
          created_by: string | null
          email: string | null
          final_due_date: string | null
          flexible_payment: boolean
          full_name: string
          id: string
          installment_amount: number
          installment_due_dates: string[]
          installments_paid: number
          last_payment_date: string | null
          next_due_date: string | null
          payment_link: string
          paystack_page_id: string | null
          paystack_page_slug: string | null
          reference: string
          status: string
          total_amount: number
          total_installments: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_granted?: boolean
          amount_paid?: number
          cohort_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          final_due_date?: string | null
          flexible_payment?: boolean
          full_name: string
          id?: string
          installment_amount: number
          installment_due_dates: string[]
          installments_paid?: number
          last_payment_date?: string | null
          next_due_date?: string | null
          payment_link: string
          paystack_page_id?: string | null
          paystack_page_slug?: string | null
          reference: string
          status?: string
          total_amount: number
          total_installments: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_granted?: boolean
          amount_paid?: number
          cohort_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          final_due_date?: string | null
          flexible_payment?: boolean
          full_name?: string
          id?: string
          installment_amount?: number
          installment_due_dates?: string[]
          installments_paid?: number
          last_payment_date?: string | null
          next_due_date?: string | null
          payment_link?: string
          paystack_page_id?: string | null
          paystack_page_slug?: string | null
          reference?: string
          status?: string
          total_amount?: number
          total_installments?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bootcamp_enrollments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "bootcamp_cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      bootcamp_payment_events: {
        Row: {
          amount: number
          created_at: string
          enrollment_id: string
          id: string
          paid_at: string
          paystack_event_id: string
          paystack_reference: string | null
          raw: Json | null
        }
        Insert: {
          amount: number
          created_at?: string
          enrollment_id: string
          id?: string
          paid_at?: string
          paystack_event_id: string
          paystack_reference?: string | null
          raw?: Json | null
        }
        Update: {
          amount?: number
          created_at?: string
          enrollment_id?: string
          id?: string
          paid_at?: string
          paystack_event_id?: string
          paystack_reference?: string | null
          raw?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "bootcamp_payment_events_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "bootcamp_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          logo_url: string | null
          name: string
          order_index: number
          slug: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          logo_url?: string | null
          name: string
          order_index?: number
          slug: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          logo_url?: string | null
          name?: string
          order_index?: number
          slug?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      business_leads: {
        Row: {
          assigned_to: string | null
          company_name: string
          company_size: string | null
          contact_name: string
          created_at: string
          email: string
          id: string
          industry: string | null
          internal_notes: string | null
          message: string | null
          phone: string | null
          status: string
          training_needs: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_name: string
          company_size?: string | null
          contact_name: string
          created_at?: string
          email: string
          id?: string
          industry?: string | null
          internal_notes?: string | null
          message?: string | null
          phone?: string | null
          status?: string
          training_needs?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_name?: string
          company_size?: string | null
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          industry?: string | null
          internal_notes?: string | null
          message?: string | null
          phone?: string | null
          status?: string
          training_needs?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          course_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index?: number
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          slug?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          course_id: string
          created_at: string
          id: string
          issued_at: string
          metadata: Json | null
          user_id: string
          verification_code: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          issued_at?: string
          metadata?: Json | null
          user_id: string
          verification_code: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          issued_at?: string
          metadata?: Json | null
          user_id?: string
          verification_code?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          status: string
          subject: string | null
          unread_admin_count: number | null
          unread_user_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          subject?: string | null
          unread_admin_count?: number | null
          unread_user_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          subject?: string | null
          unread_admin_count?: number | null
          unread_user_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          sender_id: string
          sender_role?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_pages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          meta_description: string | null
          order_index: number
          show_in_footer: boolean
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          meta_description?: string | null
          order_index?: number
          show_in_footer?: boolean
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          meta_description?: string | null
          order_index?: number
          show_in_footer?: boolean
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cohort_materials: {
        Row: {
          cohort_id: string
          created_at: string
          created_by: string | null
          description: string | null
          file_path: string | null
          file_size: number | null
          id: string
          kind: string
          mime_type: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          cohort_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          kind?: string
          mime_type?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          cohort_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          kind?: string
          mime_type?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cohort_materials_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_members: {
        Row: {
          cohort_id: string
          id: string
          is_lead: boolean
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          cohort_id: string
          id?: string
          is_lead?: boolean
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          cohort_id?: string
          id?: string
          is_lead?: boolean
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_members_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_post_reactions: {
        Row: {
          cohort_id: string
          created_at: string
          emoji: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          cohort_id: string
          created_at?: string
          emoji: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          cohort_id?: string
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_post_reactions_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "cohort_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_posts: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          cohort_id: string
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          is_resolved: boolean
          kind: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          cohort_id: string
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_resolved?: boolean
          kind?: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          cohort_id?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_resolved?: boolean
          kind?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_posts_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cohort_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_reads: {
        Row: {
          cohort_id: string
          created_at: string
          id: string
          last_read_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cohort_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cohort_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_reads_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_session_rsvps: {
        Row: {
          attended: boolean
          created_at: string
          id: string
          marked_at: string | null
          marked_by: string | null
          session_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attended?: boolean
          created_at?: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          session_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attended?: boolean
          created_at?: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          session_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_session_rsvps_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cohort_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_sessions: {
        Row: {
          cohort_id: string
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          id: string
          meeting_url: string | null
          scheduled_at: string
          title: string
          updated_at: string
        }
        Insert: {
          cohort_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          meeting_url?: string | null
          scheduled_at: string
          title: string
          updated_at?: string
        }
        Update: {
          cohort_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          meeting_url?: string | null
          scheduled_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_sessions_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          cohort_number: number | null
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          slug: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cohort_number?: number | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          slug?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cohort_number?: number | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          slug?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohorts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_announcements: {
        Row: {
          content: string
          course_id: string
          created_at: string
          created_by: string
          id: string
          title: string
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string
          created_by: string
          id?: string
          title: string
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          created_by?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_announcements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_qna: {
        Row: {
          course_id: string
          created_at: string
          id: string
          lesson_id: string | null
          parent_id: string | null
          question: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          lesson_id?: string | null
          parent_id?: string | null
          question: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          lesson_id?: string | null
          parent_id?: string | null
          question?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_qna_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_qna_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_qna_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "course_qna"
            referencedColumns: ["id"]
          },
        ]
      }
      course_registrations: {
        Row: {
          country: string | null
          course_id: string
          created_at: string
          email: string
          experience_level: string | null
          full_name: string
          goal: string | null
          how_did_you_hear: string | null
          id: string
          internal_notes: string | null
          motivation: string | null
          profession: string | null
          registration_type: string
          status: string
          updated_at: string
          user_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          country?: string | null
          course_id: string
          created_at?: string
          email: string
          experience_level?: string | null
          full_name: string
          goal?: string | null
          how_did_you_hear?: string | null
          id?: string
          internal_notes?: string | null
          motivation?: string | null
          profession?: string | null
          registration_type?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          country?: string | null
          course_id?: string
          created_at?: string
          email?: string
          experience_level?: string | null
          full_name?: string
          goal?: string | null
          how_did_you_hear?: string | null
          id?: string
          internal_notes?: string | null
          motivation?: string | null
          profession?: string | null
          registration_type?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      course_tags: {
        Row: {
          course_id: string
          id: string
          tag_id: string
        }
        Insert: {
          course_id: string
          id?: string
          tag_id: string
        }
        Update: {
          course_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_tags_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string
          category_id: string | null
          cohort_only: boolean
          course_type: string | null
          created_at: string
          cross_sell_course_ids: string[] | null
          currency: string | null
          description: string | null
          difficulty: string
          discount_end: string | null
          discount_price: number | null
          discount_start: string | null
          duration_hours: number
          early_bird_price: number | null
          enable_reviews: boolean | null
          enrollment_end: string | null
          enrollment_start: string | null
          id: string
          instructor_id: string | null
          intro_video_url: string | null
          is_published: boolean | null
          learning_outcomes: string[] | null
          max_enrollment: number | null
          price: number
          product_type: string | null
          purchase_note: string | null
          rating: number | null
          slug: string | null
          status: string | null
          students_enrolled: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          upsell_course_ids: string[] | null
          whats_included: string[] | null
        }
        Insert: {
          category: string
          category_id?: string | null
          cohort_only?: boolean
          course_type?: string | null
          created_at?: string
          cross_sell_course_ids?: string[] | null
          currency?: string | null
          description?: string | null
          difficulty: string
          discount_end?: string | null
          discount_price?: number | null
          discount_start?: string | null
          duration_hours: number
          early_bird_price?: number | null
          enable_reviews?: boolean | null
          enrollment_end?: string | null
          enrollment_start?: string | null
          id?: string
          instructor_id?: string | null
          intro_video_url?: string | null
          is_published?: boolean | null
          learning_outcomes?: string[] | null
          max_enrollment?: number | null
          price?: number
          product_type?: string | null
          purchase_note?: string | null
          rating?: number | null
          slug?: string | null
          status?: string | null
          students_enrolled?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          upsell_course_ids?: string[] | null
          whats_included?: string[] | null
        }
        Update: {
          category?: string
          category_id?: string | null
          cohort_only?: boolean
          course_type?: string | null
          created_at?: string
          cross_sell_course_ids?: string[] | null
          currency?: string | null
          description?: string | null
          difficulty?: string
          discount_end?: string | null
          discount_price?: number | null
          discount_start?: string | null
          duration_hours?: number
          early_bird_price?: number | null
          enable_reviews?: boolean | null
          enrollment_end?: string | null
          enrollment_start?: string | null
          id?: string
          instructor_id?: string | null
          intro_video_url?: string | null
          is_published?: boolean | null
          learning_outcomes?: string[] | null
          max_enrollment?: number | null
          price?: number
          product_type?: string | null
          purchase_note?: string | null
          rating?: number | null
          slug?: string | null
          status?: string | null
          students_enrolled?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          upsell_course_ids?: string[] | null
          whats_included?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      email_announcements: {
        Row: {
          body: string
          id: string
          recipient_count: number | null
          sent_at: string
          sent_by: string
          status: string
          subject: string
          target_audience: string
        }
        Insert: {
          body: string
          id?: string
          recipient_count?: number | null
          sent_at?: string
          sent_by: string
          status?: string
          subject: string
          target_audience?: string
        }
        Update: {
          body?: string
          id?: string
          recipient_count?: number | null
          sent_at?: string
          sent_by?: string
          status?: string
          subject?: string
          target_audience?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          access_source: string
          course_id: string
          created_at: string
          granted_by: string | null
          id: string
          is_completed: boolean | null
          last_lesson_id: string | null
          last_seen_at: string | null
          payment_status: string | null
          progress_percentage: number | null
          resume_position_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          access_source?: string
          course_id: string
          created_at?: string
          granted_by?: string | null
          id?: string
          is_completed?: boolean | null
          last_lesson_id?: string | null
          last_seen_at?: string | null
          payment_status?: string | null
          progress_percentage?: number | null
          resume_position_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          access_source?: string
          course_id?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          is_completed?: boolean | null
          last_lesson_id?: string | null
          last_seen_at?: string | null
          payment_status?: string | null
          progress_percentage?: number | null
          resume_position_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_payouts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          method: string | null
          notes: string | null
          payee_name: string
          payee_type: string
          payee_user_id: string | null
          period_end: string | null
          period_start: string | null
          processed_at: string | null
          processed_by: string | null
          reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          method?: string | null
          notes?: string | null
          payee_name: string
          payee_type?: string
          payee_user_id?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          method?: string | null
          notes?: string | null
          payee_name?: string
          payee_type?: string
          payee_user_id?: string | null
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_refunds: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          order_id: string | null
          processed_at: string | null
          processed_by: string | null
          provider_reference: string | null
          reason: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          provider_reference?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          provider_reference?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      gone_urls: {
        Row: {
          created_at: string
          id: string
          path: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          reason?: string | null
        }
        Relationships: []
      }
      google_calendar_tokens: {
        Row: {
          access_token: string | null
          connected_at: string
          expires_at: string | null
          google_email: string | null
          id: string
          refresh_token: string
          scope: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string
          expires_at?: string | null
          google_email?: string | null
          id?: string
          refresh_token: string
          scope?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string
          expires_at?: string | null
          google_email?: string | null
          id?: string
          refresh_token?: string
          scope?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      influencer_referrals: {
        Row: {
          commission_earned: number
          conversion_type: string
          course_id: string
          created_at: string
          discount_applied: number
          final_price: number
          id: string
          order_id: string | null
          original_price: number
          promo_code_id: string | null
          registration_id: string | null
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          commission_earned?: number
          conversion_type?: string
          course_id: string
          created_at?: string
          discount_applied?: number
          final_price?: number
          id?: string
          order_id?: string | null
          original_price?: number
          promo_code_id?: string | null
          registration_id?: string | null
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          commission_earned?: number
          conversion_type?: string
          course_id?: string
          created_at?: string
          discount_applied?: number
          final_price?: number
          id?: string
          order_id?: string | null
          original_price?: number
          promo_code_id?: string | null
          registration_id?: string | null
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "influencer_referrals_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_referrals_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      instructors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          courses_count: number | null
          created_at: string
          id: string
          name: string
          rating: number | null
          role: string | null
          students_count: number | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          courses_count?: number | null
          created_at?: string
          id?: string
          name: string
          rating?: number | null
          role?: string | null
          students_count?: number | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          courses_count?: number | null
          created_at?: string
          id?: string
          name?: string
          rating?: number | null
          role?: string | null
          students_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          cover_letter: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          job_id: string
          notes: string | null
          phone: string | null
          resume_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          job_id: string
          notes?: string | null
          phone?: string | null
          resume_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          job_id?: string
          notes?: string | null
          phone?: string | null
          resume_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          application_url: string | null
          applications_count: number | null
          benefits: string | null
          company: string
          contact_email: string | null
          created_at: string
          currency: string | null
          description: string
          expires_at: string | null
          id: string
          is_published: boolean | null
          is_remote: boolean | null
          job_type: string
          location: string | null
          posted_by: string | null
          requirements: string | null
          salary_max: number | null
          salary_min: number | null
          title: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          application_url?: string | null
          applications_count?: number | null
          benefits?: string | null
          company: string
          contact_email?: string | null
          created_at?: string
          currency?: string | null
          description: string
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          is_remote?: boolean | null
          job_type?: string
          location?: string | null
          posted_by?: string | null
          requirements?: string | null
          salary_max?: number | null
          salary_min?: number | null
          title: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          application_url?: string | null
          applications_count?: number | null
          benefits?: string | null
          company?: string
          contact_email?: string | null
          created_at?: string
          currency?: string | null
          description?: string
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          is_remote?: boolean | null
          job_type?: string
          location?: string | null
          posted_by?: string | null
          requirements?: string | null
          salary_max?: number | null
          salary_min?: number | null
          title?: string
          updated_at?: string
          views_count?: number | null
        }
        Relationships: []
      }
      kb_articles: {
        Row: {
          body: string
          category_id: string | null
          created_at: string
          created_by: string | null
          helpful_no: number
          helpful_yes: number
          id: string
          is_published: boolean
          slug: string
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          body?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          helpful_no?: number
          helpful_yes?: number
          id?: string
          is_published?: boolean
          slug: string
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          body?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          helpful_no?: number
          helpful_yes?: number
          id?: string
          is_published?: boolean
          slug?: string
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "kb_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "kb_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_published: boolean
          order_index: number
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean
          order_index?: number
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean
          order_index?: number
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_sources: {
        Row: {
          created_at: string
          form_data: Json | null
          form_type: string | null
          id: string
          landing_page: string | null
          referrer: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string
          form_data?: Json | null
          form_type?: string | null
          id?: string
          landing_page?: string | null
          referrer?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string
          form_data?: Json | null
          form_type?: string | null
          id?: string
          landing_page?: string | null
          referrer?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      learning_path_courses: {
        Row: {
          course_id: string
          id: string
          order_index: number
          path_id: string
        }
        Insert: {
          course_id: string
          id?: string
          order_index?: number
          path_id: string
        }
        Update: {
          course_id?: string
          id?: string
          order_index?: number
          path_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_courses_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          is_deleted: boolean
          lesson_id: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          lesson_id: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          lesson_id?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_comments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "lesson_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          lesson_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          lesson_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          first_opened_at: string | null
          id: string
          is_completed: boolean
          is_unlocked: boolean
          last_opened_at: string | null
          lesson_id: string
          open_count: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          first_opened_at?: string | null
          id?: string
          is_completed?: boolean
          is_unlocked?: boolean
          last_opened_at?: string | null
          lesson_id: string
          open_count?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          first_opened_at?: string | null
          id?: string
          is_completed?: boolean
          is_unlocked?: boolean
          last_opened_at?: string | null
          lesson_id?: string
          open_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_resources: {
        Row: {
          course_id: string
          created_at: string
          file_name: string
          file_path: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          lesson_id: string
          order_index: number
        }
        Insert: {
          course_id: string
          created_at?: string
          file_name: string
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          lesson_id: string
          order_index?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          file_name?: string
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          lesson_id?: string
          order_index?: number
        }
        Relationships: []
      }
      lesson_transcripts: {
        Row: {
          created_at: string
          language: string | null
          lesson_id: string
          transcript: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          language?: string | null
          lesson_id: string
          transcript?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          language?: string | null
          lesson_id?: string
          transcript?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_unlocks: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          lesson_id: string
          note: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          lesson_id: string
          note?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          lesson_id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_unlocks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content_type: string | null
          content_url: string | null
          created_at: string
          duration: string | null
          id: string
          module_id: string
          order_index: number
          title: string
        }
        Insert: {
          content_type?: string | null
          content_url?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          module_id: string
          order_index?: number
          title: string
        }
        Update: {
          content_type?: string | null
          content_url?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          module_id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_calendar_events: {
        Row: {
          created_at: string
          google_event_id: string
          id: string
          live_class_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          google_event_id: string
          id?: string
          live_class_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          google_event_id?: string
          id?: string
          live_class_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      live_classes: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          id: string
          instructor_name: string | null
          meeting_provider: string
          meeting_url: string
          reminder_sent_at: string | null
          scheduled_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          instructor_name?: string | null
          meeting_provider?: string
          meeting_url: string
          reminder_sent_at?: string | null
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          instructor_name?: string | null
          meeting_provider?: string
          meeting_url?: string
          reminder_sent_at?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      media_library: {
        Row: {
          alt_text: string | null
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          folder: string | null
          id: string
          uploaded_by: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          folder?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          folder?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          id: string
          order_index: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          order_index?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          course_id: string
          created_at: string
          currency: string
          discount_amount: number | null
          id: string
          metadata: Json | null
          paystack_reference: string | null
          promo_code_id: string | null
          reference: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          course_id: string
          created_at?: string
          currency?: string
          discount_amount?: number | null
          id?: string
          metadata?: Json | null
          paystack_reference?: string | null
          promo_code_id?: string | null
          reference: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          course_id?: string
          created_at?: string
          currency?: string
          discount_amount?: number | null
          id?: string
          metadata?: Json | null
          paystack_reference?: string | null
          promo_code_id?: string | null
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      page_seo: {
        Row: {
          canonical_url: string | null
          created_at: string
          description: string | null
          id: string
          keywords: string | null
          no_index: boolean
          og_image_url: string | null
          path: string
          title: string | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string | null
          no_index?: boolean
          og_image_url?: string | null
          path: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string | null
          no_index?: boolean
          og_image_url?: string | null
          path?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          created_at: string
          features: string[] | null
          highlight: boolean | null
          id: string
          name: string
          order_index: number | null
          period: string | null
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: string[] | null
          highlight?: boolean | null
          id?: string
          name: string
          order_index?: number | null
          period?: string | null
          price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: string[] | null
          highlight?: boolean | null
          id?: string
          name?: string
          order_index?: number | null
          period?: string | null
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          commission_percentage: number
          course_ids: string[]
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          influencer_email: string | null
          influencer_name: string
          is_active: boolean
          landing_path: string | null
          max_uses: number | null
          revenue_generated: number
          slug: string | null
          updated_at: string
          usage_count: number
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          code: string
          commission_percentage?: number
          course_ids?: string[]
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          influencer_email?: string | null
          influencer_name: string
          is_active?: boolean
          landing_path?: string | null
          max_uses?: number | null
          revenue_generated?: number
          slug?: string | null
          updated_at?: string
          usage_count?: number
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          code?: string
          commission_percentage?: number
          course_ids?: string[]
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          influencer_email?: string | null
          influencer_name?: string
          is_active?: boolean
          landing_path?: string | null
          max_uses?: number | null
          revenue_generated?: number
          slug?: string | null
          updated_at?: string
          usage_count?: number
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          completed_at: string
          created_at: string
          id: string
          quiz_id: string
          score: number
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string
          created_at?: string
          id?: string
          quiz_id: string
          score?: number
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string
          created_at?: string
          id?: string
          quiz_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string
          explanation: string | null
          id: string
          options: Json
          order_index: number
          question_text: string
          quiz_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          order_index?: number
          question_text: string
          quiz_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          explanation?: string | null
          id?: string
          options?: Json
          order_index?: number
          question_text?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          id: string
          is_ai_generated: boolean
          is_visible: boolean
          lesson_id: string
          max_attempts: number | null
          passing_score: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          is_visible?: boolean
          lesson_id: string
          max_attempts?: number | null
          passing_score?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          is_visible?: boolean
          lesson_id?: string
          max_attempts?: number | null
          passing_score?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_notes: {
        Row: {
          author_id: string
          created_at: string
          id: string
          note: string
          registration_id: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          note: string
          registration_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          note?: string
          registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_notes_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "course_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          course_id: string
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          course_id: string
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          course_id?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          allowed: boolean
          role: Database["public"]["Enums"]["app_role"]
          route: string
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          role: Database["public"]["Enums"]["app_role"]
          route: string
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          route?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_backups: {
        Row: {
          created_at: string
          drive_file_id: string | null
          drive_file_url: string | null
          drive_folder_id: string | null
          error: string | null
          id: string
          row_count: number | null
          size_bytes: number | null
          status: string
          table_count: number | null
          triggered_by: string
        }
        Insert: {
          created_at?: string
          drive_file_id?: string | null
          drive_file_url?: string | null
          drive_folder_id?: string | null
          error?: string | null
          id?: string
          row_count?: number | null
          size_bytes?: number | null
          status?: string
          table_count?: number | null
          triggered_by?: string
        }
        Update: {
          created_at?: string
          drive_file_id?: string | null
          drive_file_url?: string | null
          drive_folder_id?: string | null
          error?: string | null
          id?: string
          row_count?: number | null
          size_bytes?: number | null
          status?: string
          table_count?: number | null
          triggered_by?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          content_type: string | null
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      study_plans: {
        Row: {
          course_id: string
          created_at: string
          hours_per_week: number
          id: string
          plan_json: Json
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          hours_per_week?: number
          id?: string
          plan_json?: Json
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          hours_per_week?: number
          id?: string
          plan_json?: Json
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          order_index: number | null
          quote: string
          rating: number | null
          role: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name: string
          order_index?: number | null
          quote: string
          rating?: number | null
          role?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          order_index?: number | null
          quote?: string
          rating?: number | null
          role?: string | null
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          item_key: string
          order_index: number
          pinned_at: string
          user_id: string
        }
        Insert: {
          item_key: string
          order_index?: number
          pinned_at?: string
          user_id: string
        }
        Update: {
          item_key?: string
          order_index?: number
          pinned_at?: string
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
      user_xp_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          points: number
          ref_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          points?: number
          ref_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          points?: number
          ref_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          attempts: number
          created_at: string
          event_id: string | null
          event_type: string | null
          id: string
          last_error: string | null
          payload: Json | null
          processed_at: string | null
          provider: string
          reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_id?: string | null
          event_type?: string | null
          id?: string
          last_error?: string | null
          payload?: Json | null
          processed_at?: string | null
          provider?: string
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          event_id?: string | null
          event_type?: string | null
          id?: string
          last_error?: string | null
          payload?: Json | null
          processed_at?: string | null
          provider?: string
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      reviews_public: {
        Row: {
          comment: string | null
          course_id: string | null
          created_at: string | null
          id: string | null
          rating: number | null
        }
        Insert: {
          comment?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string | null
          rating?: number | null
        }
        Update: {
          comment?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string | null
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      claim_bootcamp_enrollment: { Args: never; Returns: number }
      clear_login_lockout: { Args: { _key: string }; Returns: number }
      get_cohort_leaderboard: {
        Args: { p_cohort_id: string }
        Returns: {
          assignments_submitted: number
          avatar_url: string
          full_name: string
          lessons_completed: number
          role: string
          user_id: string
          weekly_xp: number
          xp: number
        }[]
      }
      get_cohort_member_emails: {
        Args: { p_cohort_id: string }
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      get_course_activity_feed: {
        Args: { p_course_id?: string; p_limit?: number }
        Returns: {
          avatar_url: string
          course_id: string
          course_title: string
          detail: string
          email: string
          event_type: string
          full_name: string
          item_title: string
          lesson_id: string
          lesson_title: string
          max_score: number
          occurred_at: string
          score: number
          user_id: string
        }[]
      }
      get_course_curriculum: {
        Args: { p_course_id: string }
        Returns: {
          lesson_duration: string
          lesson_id: string
          lesson_order_index: number
          lesson_title: string
          module_id: string
          module_order_index: number
          module_title: string
        }[]
      }
      get_course_instructors: {
        Args: { p_course_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          is_lead: boolean
          user_id: string
        }[]
      }
      get_profiles_count: { Args: never; Returns: number }
      get_public_profiles: {
        Args: { p_user_ids: string[] }
        Returns: {
          avatar_url: string
          full_name: string
          user_id: string
        }[]
      }
      get_quiz_questions: {
        Args: { p_quiz_id: string }
        Returns: {
          correct_answer: string
          explanation: string
          id: string
          options: Json
          order_index: number
          question_text: string
          quiz_id: string
        }[]
      }
      get_user_xp: {
        Args: { p_user_id: string }
        Returns: {
          level: number
          total_points: number
        }[]
      }
      grade_quiz_submission: {
        Args: { p_answers: Json; p_quiz_id: string }
        Returns: {
          passed: boolean
          passing_score: number
          score: number
        }[]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      influencer_click_counts: {
        Args: never
        Returns: {
          clicks: number
          promo_code_id: string
        }[]
      }
      instructor_teaches_course: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      instructor_teaches_lesson: {
        Args: { _lesson_id: string; _user_id: string }
        Returns: boolean
      }
      is_cohort_instructor: {
        Args: { _cohort_id: string; _user_id: string }
        Returns: boolean
      }
      is_cohort_member: {
        Args: { _cohort_id: string; _user_id: string }
        Returns: boolean
      }
      is_ip_blocked: { Args: { _ip: string }; Returns: boolean }
      is_login_locked: {
        Args: { _email: string; _ip: string }
        Returns: boolean
      }
      is_paid_enrolled: { Args: { _course_id: string }; Returns: boolean }
      is_paid_enrolled_for_assignment: {
        Args: { _assignment_id: string }
        Returns: boolean
      }
      is_paid_enrolled_for_lesson: {
        Args: { _lesson_id: string }
        Returns: boolean
      }
      mark_submitters_complete: {
        Args: { p_course_id: string }
        Returns: {
          learners: number
          lessons_completed: number
        }[]
      }
      record_lesson_open: { Args: { _lesson_id: string }; Returns: undefined }
      resolve_promo_slug: {
        Args: { p_slug: string }
        Returns: {
          code: string
          id: string
          influencer_name: string
          is_active: boolean
          landing_path: string
          slug: string
          utm_campaign: string
          utm_content: string
          utm_medium: string
          utm_source: string
        }[]
      }
      reveal_ai_quiz_for_lesson: {
        Args: { _lesson_id: string }
        Returns: string
      }
      role_can_access: {
        Args: { _role: Database["public"]["Enums"]["app_role"]; _route: string }
        Returns: boolean
      }
      seed_first_lesson_unlock: {
        Args: { _course_id: string; _user_id: string }
        Returns: undefined
      }
      slugify: { Args: { _text: string }; Returns: string }
      unique_course_slug: {
        Args: { _base: string; _id: string }
        Returns: string
      }
      user_can_access_course: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      validate_promo_code: {
        Args: { p_code: string }
        Returns: {
          code: string
          course_ids: string[]
          discount_type: string
          discount_value: number
          expires_at: string
          id: string
          influencer_name: string
          is_active: boolean
          landing_path: string
          max_uses: number
          slug: string
          usage_count: number
          utm_campaign: string
          utm_content: string
          utm_medium: string
          utm_source: string
        }[]
      }
      verify_certificate: {
        Args: { p_code: string }
        Returns: {
          course_category: string
          course_duration_hours: number
          course_id: string
          course_title: string
          id: string
          issued_at: string
          recipient_name: string
          user_id: string
          verification_code: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "instructor"
        | "support"
        | "finance"
        | "content_editor"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "instructor",
        "support",
        "finance",
        "content_editor",
      ],
    },
  },
} as const
