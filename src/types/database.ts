/**
 * Hand-crafted TypeScript types matching the Yours2Cash Postgres schema.
 *
 * Replace this file with the output of:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
 * once the Supabase project is provisioned and migrations have run.
 *
 * The shape mirrors the Supabase-generated format so all query helpers
 * work without modification after the swap.
 */

export type ListingCondition = "new" | "like_new" | "good" | "fair"
export type ListingStatus = "active" | "sold" | "removed"
export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          bio: string | null
          state: string
          city: string | null
          avg_rating: number
          review_count: number
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          bio?: string | null
          state?: string
          city?: string | null
          avg_rating?: number
          review_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          bio?: string | null
          state?: string
          city?: string | null
          avg_rating?: number
          review_count?: number
          created_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          slug: string
          name: string
          sort_order: number
        }
        Insert: {
          id?: string
          slug: string
          name: string
          sort_order?: number
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      listings: {
        Row: {
          id: string
          seller_id: string
          title: string
          description: string
          price: number
          category_id: string
          condition: ListingCondition
          state: string
          city: string | null
          status: ListingStatus
          is_featured: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          title: string
          description: string
          price: number
          category_id: string
          condition: ListingCondition
          state: string
          city?: string | null
          status?: ListingStatus
          is_featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          title?: string
          description?: string
          price?: number
          category_id?: string
          condition?: ListingCondition
          state?: string
          city?: string | null
          status?: ListingStatus
          is_featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_images: {
        Row: {
          id: string
          listing_id: string
          storage_path: string
          position: number
        }
        Insert: {
          id?: string
          listing_id: string
          storage_path: string
          position?: number
        }
        Update: {
          id?: string
          listing_id?: string
          storage_path?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          id: string
          listing_id: string
          buyer_id: string
          seller_id: string
          created_at: string
          last_message_at: string
          last_message_body: string | null
          last_message_sender_id: string | null
        }
        Insert: {
          id?: string
          listing_id: string
          buyer_id: string
          seller_id: string
          created_at?: string
          last_message_at?: string
          last_message_body?: string | null
          last_message_sender_id?: string | null
        }
        Update: {
          id?: string
          listing_id?: string
          buyer_id?: string
          seller_id?: string
          created_at?: string
          last_message_at?: string
          last_message_body?: string | null
          last_message_sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          body: string
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          body: string
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          body?: string
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          id: string
          listing_id: string
          buyer_id: string
          seller_id: string
          amount: number
          status: OrderStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          buyer_id: string
          seller_id: string
          amount: number
          status?: OrderStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          buyer_id?: string
          seller_id?: string
          amount?: number
          status?: OrderStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          id: string
          order_id: string
          status: OrderStatus
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          status: OrderStatus
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          status?: OrderStatus
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          id: string
          order_id: string
          reviewer_id: string
          seller_id: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          reviewer_id: string
          seller_id: string
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          reviewer_id?: string
          seller_id?: string
          rating?: number
          comment?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_seller_id_fkey"
            columns: ["seller_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      listing_condition: ListingCondition
      listing_status: ListingStatus
      order_status: OrderStatus
    }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]

export type Profile = Tables<"profiles">
export type Category = Tables<"categories">
export type Listing = Tables<"listings">
export type ListingImage = Tables<"listing_images">
export type Conversation = Tables<"conversations">
export type Message = Tables<"messages">
export type Order = Tables<"orders">
export type OrderEvent = Tables<"order_events">
export type Review = Tables<"reviews">

export type ListingWithImages = Listing & {
  listing_images: ListingImage[]
}

export type ListingWithSeller = Listing & {
  profiles: Profile
  listing_images: ListingImage[]
}

export type ConversationWithParticipants = Conversation & {
  buyer: Profile
  seller: Profile
  listing: Pick<Listing, "id" | "title" | "price">
}

export type MessageWithSender = Message & {
  profiles: Pick<Profile, "id" | "display_name" | "avatar_url">
}

export type OrderWithDetails = Order & {
  listing: Pick<Listing, "id" | "title" | "price">
  buyer: Profile
  seller: Profile
  order_events: OrderEvent[]
}

export type ReviewWithReviewer = Review & {
  profiles: Pick<Profile, "id" | "display_name" | "avatar_url">
}
