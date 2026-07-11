/**
 * Query helpers for conversations and messages.
 *
 * The upsertConversation helper uses Supabase's onConflict behaviour to
 * return the existing conversation when one already exists for the same
 * (listing, buyer, seller) triple, avoiding duplicate threads.
 */
import { supabase } from "../supabase"
import type {
  Conversation,
  ConversationWithParticipants,
  Message,
  MessageWithSender,
} from "../../types/database"
import type { QueryResult } from "./types"

export async function fetchConversations(
  userId: string
): Promise<QueryResult<ConversationWithParticipants[]>> {
  const { data, error } = await supabase
    .from("conversations")
    .select(`
      *,
      buyer:profiles!conversations_buyer_id_fkey(id, display_name, avatar_url),
      seller:profiles!conversations_seller_id_fkey(id, display_name, avatar_url),
      listing:listings!conversations_listing_id_fkey(id, title, price)
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("last_message_at", { ascending: false })

  return {
    data: data as ConversationWithParticipants[] | null,
    error: error?.message ?? null,
  }
}

export async function upsertConversation(
  listingId: string,
  buyerId: string,
  sellerId: string
): Promise<QueryResult<Conversation>> {
  const { data, error } = await supabase
    .from("conversations")
    .upsert(
      { listing_id: listingId, buyer_id: buyerId, seller_id: sellerId },
      { onConflict: "listing_id,buyer_id,seller_id", ignoreDuplicates: false }
    )
    .select()
    .single()

  return { data, error: error?.message ?? null }
}

export async function fetchMessages(
  conversationId: string
): Promise<QueryResult<MessageWithSender[]>> {
  const { data, error } = await supabase
    .from("messages")
    .select(`
      *,
      profiles!messages_sender_id_fkey(id, display_name, avatar_url)
    `)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  return {
    data: data as MessageWithSender[] | null,
    error: error?.message ?? null,
  }
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string
): Promise<QueryResult<Message>> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select()
    .single()

  return { data, error: error?.message ?? null }
}

export async function markMessagesRead(
  conversationId: string,
  readerId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", readerId)
    .is("read_at", null)

  return { error: error?.message ?? null }
}

export function subscribeToMessages(
  conversationId: string,
  onMessage: (message: Message) => void
) {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage(payload.new as Message)
    )
    .subscribe()
}
