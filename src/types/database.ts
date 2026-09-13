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
      applicants: {
        Row: {
          created_at: string
          current_semester: number
          email: string
          encrypted_password: string
          first_name: string
          id: string
          last_name: string
          purpose: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["applicant_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_semester: number
          email: string
          encrypted_password: string
          first_name: string
          id?: string
          last_name: string
          purpose: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["applicant_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_semester?: number
          email?: string
          encrypted_password?: string
          first_name?: string
          id?: string
          last_name?: string
          purpose?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["applicant_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applicants_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "applicants_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_cart_items: {
        Row: {
          admin_note: string | null
          approved_quantity: number | null
          cart_id: string
          created_at: string
          id: string
          item_id: string
          item_status: string
          quantity: number
          request_type: string
        }
        Insert: {
          admin_note?: string | null
          approved_quantity?: number | null
          cart_id: string
          created_at?: string
          id?: string
          item_id: string
          item_status?: string
          quantity?: number
          request_type?: string
        }
        Update: {
          admin_note?: string | null
          approved_quantity?: number | null
          cart_id?: string
          created_at?: string
          id?: string
          item_id?: string
          item_status?: string
          quantity?: number
          request_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "equipment_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_cart_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_carts: {
        Row: {
          created_at: string
          id: string
          reason: string
          requester_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          status_note: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          requester_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          status_note?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          requester_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          status_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_carts_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "equipment_carts_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_carts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "equipment_carts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_request_return_units: {
        Row: {
          created_at: string
          giving_condition: string | null
          id: string
          item_id: string
          lifecycle_status: string
          request_id: string
          return_condition: string | null
          returned_at: string | null
          returned_by: string | null
          unit_index: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          giving_condition?: string | null
          id?: string
          item_id: string
          lifecycle_status?: string
          request_id: string
          return_condition?: string | null
          returned_at?: string | null
          returned_by?: string | null
          unit_index: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          giving_condition?: string | null
          id?: string
          item_id?: string
          lifecycle_status?: string
          request_id?: string
          return_condition?: string | null
          returned_at?: string | null
          returned_by?: string | null
          unit_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_request_return_units_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_request_return_units_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "equipment_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_request_return_units_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "equipment_request_return_units_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_requests: {
        Row: {
          approved_by: string | null
          approved_quantity: number | null
          created_at: string
          id: string
          item_id: string
          quantity: number
          reason: string
          request_type: string
          requester_id: string
          reviewed_at: string | null
          status: Database["public"]["Enums"]["request_status"]
          status_note: string | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          approved_quantity?: number | null
          created_at?: string
          id?: string
          item_id: string
          quantity?: number
          reason?: string
          request_type?: string
          requester_id: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          status_note?: string | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          approved_quantity?: number | null
          created_at?: string
          id?: string
          item_id?: string
          quantity?: number
          reason?: string
          request_type?: string
          requester_id?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          status_note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "equipment_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "equipment_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          _hp: string | null
          created_at: string
          custom_responses: Json
          event_id: string
          id: string
          leader_college: string
          leader_email: string
          leader_name: string
          leader_phone: string
          registration_code: string
          registration_type: string
          team_name: string | null
        }
        Insert: {
          _hp?: string | null
          created_at?: string
          custom_responses?: Json
          event_id: string
          id?: string
          leader_college: string
          leader_email: string
          leader_name: string
          leader_phone: string
          registration_code: string
          registration_type: string
          team_name?: string | null
        }
        Update: {
          _hp?: string | null
          created_at?: string
          custom_responses?: Json
          event_id?: string
          id?: string
          leader_college?: string
          leader_email?: string
          leader_name?: string
          leader_phone?: string
          registration_code?: string
          registration_type?: string
          team_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_team_members: {
        Row: {
          id: string
          member_college: string | null
          member_email: string | null
          member_name: string
          member_phone: string | null
          position: number
          registration_id: string
        }
        Insert: {
          id?: string
          member_college?: string | null
          member_email?: string | null
          member_name: string
          member_phone?: string | null
          position?: number
          registration_id: string
        }
        Update: {
          id?: string
          member_college?: string | null
          member_email?: string | null
          member_name?: string
          member_phone?: string | null
          position?: number
          registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_team_members_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json
          description: string
          ends_at: string | null
          event_type: string
          external_registration_url: string | null
          id: string
          is_exclusive: boolean
          location: string | null
          max_registrations: number | null
          registration_deadline: string | null
          registration_mode: string
          registration_open: boolean
          registration_url: string | null
          report_guests: Json
          report_media: Json
          report_sponsors: Json
          report_summary: string | null
          report_youtube_urls: Json
          starts_at: string
          team_size_max: number
          team_size_min: number
          team_size_strict: boolean
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          description?: string
          ends_at?: string | null
          event_type?: string
          external_registration_url?: string | null
          id?: string
          is_exclusive?: boolean
          location?: string | null
          max_registrations?: number | null
          registration_deadline?: string | null
          registration_mode?: string
          registration_open?: boolean
          registration_url?: string | null
          report_guests?: Json
          report_media?: Json
          report_sponsors?: Json
          report_summary?: string | null
          report_youtube_urls?: Json
          starts_at: string
          team_size_max?: number
          team_size_min?: number
          team_size_strict?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          description?: string
          ends_at?: string | null
          event_type?: string
          external_registration_url?: string | null
          id?: string
          is_exclusive?: boolean
          location?: string | null
          max_registrations?: number | null
          registration_deadline?: string | null
          registration_mode?: string
          registration_open?: boolean
          registration_url?: string | null
          report_guests?: Json
          report_media?: Json
          report_sponsors?: Json
          report_summary?: string | null
          report_youtube_urls?: Json
          starts_at?: string
          team_size_max?: number
          team_size_min?: number
          team_size_strict?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_items: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          location_city: string | null
          location_country: string | null
          media_url: string | null
          project_id: string | null
          tag: string | null
          tag_color: string | null
          title: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location_city?: string | null
          location_country?: string | null
          media_url?: string | null
          project_id?: string | null
          tag?: string | null
          tag_color?: string | null
          title: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location_city?: string | null
          location_country?: string | null
          media_url?: string | null
          project_id?: string | null
          tag?: string | null
          tag_color?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "gallery_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_history: {
        Row: {
          action: string
          actor_id: string
          created_at: string | null
          id: string
          item_id: string
          note: string | null
          quantity: number
          request_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string | null
          id?: string
          item_id: string
          note?: string | null
          quantity?: number
          request_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string | null
          id?: string
          item_id?: string
          note?: string | null
          quantity?: number
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "inventory_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "equipment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          available_quantity: number
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_consumable: boolean
          name: string
          required_safety_certification: string | null
          total_quantity: number
          updated_at: string
        }
        Insert: {
          available_quantity?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_consumable?: boolean
          name: string
          required_safety_certification?: string | null
          total_quantity?: number
          updated_at?: string
        }
        Update: {
          available_quantity?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_consumable?: boolean
          name?: string
          required_safety_certification?: string | null
          total_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      meeting_minutes: {
        Row: {
          action_items: Json
          attendee_ids: string[]
          attendees: number | null
          content: string
          counts_attendance: boolean
          created_at: string
          created_by: string | null
          id: string
          meeting_date: string
          meeting_type: string
          resources: Json
          session_scope: string
          title: string
          updated_at: string
        }
        Insert: {
          action_items?: Json
          attendee_ids?: string[]
          attendees?: number | null
          content?: string
          counts_attendance?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_date: string
          meeting_type?: string
          resources?: Json
          session_scope?: string
          title: string
          updated_at?: string
        }
        Update: {
          action_items?: Json
          attendee_ids?: string[]
          attendees?: number | null
          content?: string
          counts_attendance?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_date?: string
          meeting_type?: string
          resources?: Json
          session_scope?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_minutes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "meeting_minutes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mom_attendances: {
        Row: {
          id: string
          member_id: string
          mom_id: string
          present: boolean
          recorded_at: string
        }
        Insert: {
          id?: string
          member_id: string
          mom_id: string
          present?: boolean
          recorded_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          mom_id?: string
          present?: boolean
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mom_attendances_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "mom_attendances_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mom_attendances_mom_id_fkey"
            columns: ["mom_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes"
            referencedColumns: ["id"]
          },
        ]
      }
      mom_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          mom_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          mom_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          mom_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mom_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "mom_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mom_comments_mom_id_fkey"
            columns: ["mom_id"]
            isOneToOne: false
            referencedRelation: "meeting_minutes"
            referencedColumns: ["id"]
          },
        ]
      }
      notice_board: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          cta_label: string | null
          cta_url: string | null
          ctas: Json
          expires_at: string | null
          id: string
          is_archived: boolean
          is_pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          ctas?: Json
          expires_at?: string | null
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          ctas?: Json
          expires_at?: string | null
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notice_board_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "notice_board_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_entity_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_entity_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_entity_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          comments_count: number
          content: string
          created_at: string
          id: string
          image_url: string | null
          likes_count: number
          updated_at: string
          video_url: string | null
        }
        Insert: {
          author_id: string
          comments_count?: number
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          author_id?: string
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          contact_email: string | null
          created_at: string
          current_semester: number | null
          custom_tags: string[] | null
          display_name: string
          github_url: string | null
          id: string
          linkedin_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          roles: string[] | null
          safety_certifications: string[]
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          contact_email?: string | null
          created_at?: string
          current_semester?: number | null
          custom_tags?: string[] | null
          display_name?: string
          github_url?: string | null
          id: string
          linkedin_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          roles?: string[] | null
          safety_certifications?: string[]
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          contact_email?: string | null
          created_at?: string
          current_semester?: number | null
          custom_tags?: string[] | null
          display_name?: string
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          roles?: string[] | null
          safety_certifications?: string[]
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      project_invites: {
        Row: {
          created_at: string
          id: string
          invitee_id: string
          inviter_id: string
          project_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitee_id: string
          inviter_id: string
          project_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          project_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "project_invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "project_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          id: string
          joined_at: string | null
          project_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          project_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          project_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_requests: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          requester_id: string
          review_note: string | null
          reviewed_by: string | null
          status: string | null
          tech_stack: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          requester_id: string
          review_note?: string | null
          reviewed_by?: string | null
          status?: string | null
          tech_stack?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          requester_id?: string
          review_note?: string | null
          reviewed_by?: string | null
          status?: string | null
          tech_stack?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "project_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "project_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates: {
        Row: {
          attachments: Json | null
          author_id: string
          content: string | null
          created_at: string | null
          id: string
          image_urls: string[] | null
          project_id: string
          source_urls: string[] | null
          title: string
          version_tag: string | null
          video_urls: string[] | null
        }
        Insert: {
          attachments?: Json | null
          author_id: string
          content?: string | null
          created_at?: string | null
          id?: string
          image_urls?: string[] | null
          project_id: string
          source_urls?: string[] | null
          title: string
          version_tag?: string | null
          video_urls?: string[] | null
        }
        Update: {
          attachments?: Json | null
          author_id?: string
          content?: string | null
          created_at?: string | null
          id?: string
          image_urls?: string[] | null
          project_id?: string
          source_urls?: string[] | null
          title?: string
          version_tag?: string | null
          video_urls?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "project_updates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          status: string
          tech_stack: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          status?: string
          tech_stack?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          status?: string
          tech_stack?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_attendance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logo_url: string
          name: string
          tier: string
          updated_at: string
          website_link: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url: string
          name: string
          tier: string
          updated_at?: string
          website_link?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string
          name?: string
          tier?: string
          updated_at?: string
          website_link?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      member_attendance_summary: {
        Row: {
          attendance_pct: number | null
          avatar_url: string | null
          display_name: string | null
          is_flagged: boolean | null
          joined_at: string | null
          member_id: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          sessions_attended: number | null
          sessions_eligible: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_event_registration_count: {
        Args: { p_event_id: string }
        Returns: number
      }
      get_member_attendance_stats: {
        Args: { p_member_id: string }
        Returns: {
          attendance_pct: number
          sessions_attended: number
          sessions_eligible: number
        }[]
      }
      get_user_role: {
        Args: { uid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_inventory_review_access: { Args: never; Returns: boolean }
      is_faculty: { Args: { uid: string }; Returns: boolean }
      is_moderator: { Args: { uid: string }; Returns: boolean }
      is_notice_board_writer: { Args: never; Returns: boolean }
      lookup_profile_by_email: {
        Args: { lookup_email: string }
        Returns: {
          display_name: string
          id: string
        }[]
      }
      requester_has_required_certification: {
        Args: { p_item_id: string; p_requester_id: string }
        Returns: boolean
      }
    }
    Enums: {
      applicant_status: "pending" | "approved" | "rejected"
      request_status:
        | "pending"
        | "approved"
        | "rejected"
        | "returned"
        | "revoked"
      user_role:
        | "member"
        | "inventory_manager"
        | "president"
        | "vice_president"
        | "faculty"
        | "website_manager"
        | "printing_head"
        | "lead_developer"
        | "project_manager"
        | "social_media_head"
        | "social_media_co_head"
        | "sponsorship_head"
        | "workshop_head"
        | "mechanics_head"
        | "cad_head"
        | "electronics_head"
        | "procurement_head"
        | "makerspace_head"
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
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
    Enums: {
      applicant_status: ["pending", "approved", "rejected"],
      request_status: [
        "pending",
        "approved",
        "rejected",
        "returned",
        "revoked",
      ],
      user_role: [
        "member",
        "inventory_manager",
        "president",
        "vice_president",
        "faculty",
        "website_manager",
        "printing_head",
        "lead_developer",
        "project_manager",
        "social_media_head",
        "social_media_co_head",
        "sponsorship_head",
        "workshop_head",
        "mechanics_head",
        "cad_head",
        "electronics_head",
        "procurement_head",
        "makerspace_head",
      ],
    },
  },
} as const

export interface MomActionItem {
  task: string;
  assignee?: string;
  due_date?: string;
  completed?: boolean;
}

export interface MomResource {
  type: "photo" | "url";
  url: string;
  title: string;
}

export type CustomFieldType = "short_text" | "long_text" | "dropdown" | "mcq" | "checkbox" | "rating";

export interface CustomField {
    id: string;
    label: string;
    type: CustomFieldType;
    required: boolean;
    options: string[];
    placeholder: string;
}

export interface ReportMedia {
    type: "image" | "video";
    url: string;
    caption?: string;
}

export interface ReportGuest {
    name: string;
    title: string;
    photo_url?: string;
    description?: string;
}

export interface ReportSponsor {
    name: string;
    tier: "platinum" | "gold" | "silver" | "community";
    logo_url?: string;
    website_url?: string;
}

export interface NoticeCTA {
    label: string;
    url: string;
}
