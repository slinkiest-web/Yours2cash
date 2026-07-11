/**
 * Query helpers for conversations and messages.
 *
 * The upsertConversation helper uses Supabase's onConflict behaviour to
 * return the existing conversation when one already exists for the same
 * (listing, buyer, seller) triple, avoiding duplicate threads.
 */
import { supabase } from "../supabase"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js"
import type {
  Conversation,
  ConversationWithParticipants,
  Message,
  MessageWithSender,
} from "../../types/database"
import type { QueryResult } from "./types"

const CONVERSATION_SELECT = `
  *,
  buyer:profiles!conversations_buyer_id_fkey(id, display_name, avatar_url),
  seller:profiles!conversations_seller_id_fkey(id, display_name, avatar_url),
  listing:listings!conversations_listing_id_fkey(id, title, price)
`

export async function fetchConversations(
  userId: string
): Promise<QueryResult<ConversationWithParticipants[]>> {
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("last_message_at", { ascending: false })

  return {
    data: data as ConversationWithParticipants[] | null,
    error: error?.message ?? null,
  }
}

export async function fetchConversationById(
  conversationId: string
): Promise<QueryResult<ConversationWithParticipants>> {
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("id", conversationId)
    .single()

  return {
    data: data as ConversationWithParticipants | null,
    error: error?.message ?? null,
  }
}

/**
 * Ids of conversations that have at least one message addressed to
 * `userId` (i.e. not sent by them) that hasn't been read yet. Used to drive
 * the inbox's per-thread unread indicator.
 */
export async function fetchUnreadConversationIds(
  userId: string
): Promise<QueryResult<string[]>> {
  const { data, error } = await supabase
    .from("messages")
    .select("conversation_id")
    .is("read_at", null)
    .neq("sender_id", userId)

  if (error) {
    return { data: null, error: error.message }
  }

  const ids = [...new Set((data ?? []).map((row) => row.conversation_id))]
  return { data: ids, error: null }
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

/**
 * Subscribe to new messages in a conversation via Supabase Realtime.
 *
 * `onStatusChange` fires on every connection state transition, including
 * automatic reconnects (the client re-subscribes and reports SUBSCRIBED
 * again) — callers use this to refetch the message list on reconnect,
 * since Realtime is a live feed, not a durable queue: any INSERT events
 * that happened while disconnected are not replayed.
 */
export function subscribeToMessages(
  conversationId: string,
  onMessage: (message: Message) => void,
  onStatusChange?: (status: REALTIME_SUBSCRIBE_STATES) => void
): RealtimeChannel {
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
    .subscribe((status) => {
      onStatusChange?.(status)
    })
}

export function unsubscribeFromMessages(channel: RealtimeChannel): void {
  void supabase.removeChannel(channel)
}
