import React, { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js"
import { MessageSquare } from "lucide-react"
import { Avatar } from "../../components/ui/Avatar"
import { Button } from "../../components/ui/Button"
import { Spinner } from "../../components/ui/Spinner"
import { EmptyState } from "../../components/ui/EmptyState"
import { useToast } from "../../components/ui/Toast"
import { useAuth } from "../../context/AuthContext"
import {
  fetchConversationById,
  fetchMessages,
  markMessagesRead,
  sendMessage,
  subscribeToMessages,
  unsubscribeFromMessages,
} from "../../lib/queries/chat"
import { getAvatarPublicUrl } from "../../lib/queries/profiles"
import type { QueryResult } from "../../lib/queries/types"
import type { Message, MessageWithSender, Profile } from "../../types/database"

export const ChatThreadPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const conversationQuery = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => fetchConversationById(id!),
    enabled: !!id,
  })
  const conversation = conversationQuery.data?.data

  const messagesQuery = useQuery({
    queryKey: ["messages", id],
    queryFn: () => fetchMessages(id!),
    enabled: !!id,
  })
  const messages = messagesQuery.data?.data ?? []

  const otherParty =
    conversation && user
      ? conversation.buyer_id === user.id
        ? conversation.seller
        : conversation.buyer
      : null

  // Realtime subscription lives in a ref-backed effect: it should only
  // resubscribe when the thread (id) or viewer (user) actually changes, not
  // every time `conversation` finishes loading or is refetched — a ref
  // keeps the message handler reading the latest participant data without
  // that being a subscription dependency.
  const conversationRef = useRef(conversation)
  conversationRef.current = conversation

  useEffect(() => {
    if (!id || !user) return

    const resolveSender = (senderId: string): Pick<Profile, "id" | "display_name" | "avatar_url"> => {
      const conv = conversationRef.current
      if (conv?.buyer.id === senderId) return conv.buyer
      if (conv?.seller.id === senderId) return conv.seller
      return { id: senderId, display_name: "Unknown", avatar_url: null }
    }

    const handleIncoming = (message: Message) => {
      queryClient.setQueryData<QueryResult<MessageWithSender[]>>(["messages", id], (old) => {
        const existing = old?.data ?? []
        if (existing.some((m) => m.id === message.id)) {
          return old ?? { data: existing, error: null }
        }
        return { data: [...existing, { ...message, profiles: resolveSender(message.sender_id) }], error: null }
      })

      if (message.sender_id !== user.id) {
        markMessagesRead(id, user.id).then(({ error }) => {
          if (!error) {
            queryClient.invalidateQueries({ queryKey: ["conversations", "unread", user.id] })
          }
        })
      }
    }

    const handleStatusChange = (status: REALTIME_SUBSCRIBE_STATES) => {
      if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        // Covers both the initial connect and any auto-reconnect: Realtime
        // is a live feed, not a durable queue, so anything missed while
        // disconnected needs an explicit refetch to catch up.
        queryClient.invalidateQueries({ queryKey: ["messages", id] })
      }
    }

    const channel = subscribeToMessages(id, handleIncoming, handleStatusChange)

    return () => {
      unsubscribeFromMessages(channel)
    }
  }, [id, user, queryClient])

  // Mark the thread's existing messages read once they've loaded.
  useEffect(() => {
    if (!id || !user || !messagesQuery.isSuccess) return
    markMessagesRead(id, user.id).then(({ error }) => {
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ["conversations", "unread", user.id] })
      }
    })
  }, [id, user, messagesQuery.isSuccess, queryClient])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault()
    const body = draft.trim()
    if (!body || !id || !user || isSending) return

    setDraft("")
    setIsSending(true)

    const tempId = `optimistic-${Date.now()}`
    const optimisticMessage: MessageWithSender = {
      id: tempId,
      conversation_id: id,
      sender_id: user.id,
      body,
      read_at: null,
      created_at: new Date().toISOString(),
      profiles: {
        id: user.id,
        display_name: profile?.display_name ?? "You",
        avatar_url: profile?.avatar_url ?? null,
      },
    }

    queryClient.setQueryData<QueryResult<MessageWithSender[]>>(["messages", id], (old) => ({
      data: [...(old?.data ?? []), optimisticMessage],
      error: null,
    }))

    const { data, error } = await sendMessage(id, user.id, body)
    setIsSending(false)

    if (error || !data) {
      showToast(error ?? "Message failed to send.", "error")
      queryClient.setQueryData<QueryResult<MessageWithSender[]>>(["messages", id], (old) => ({
        data: (old?.data ?? []).filter((m) => m.id !== tempId),
        error: null,
      }))
      return
    }

    queryClient.setQueryData<QueryResult<MessageWithSender[]>>(["messages", id], (old) => ({
      data: (old?.data ?? []).map((m) =>
        m.id === tempId ? { ...m, id: data.id, created_at: data.created_at } : m
      ),
      error: null,
    }))
  }

  if (conversationQuery.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!conversation || !otherParty || !user) {
    return (
      <div className="py-12">
        <EmptyState
          icon={MessageSquare}
          title="Conversation not found"
          description="This conversation does not exist, or you do not have access to it."
          actionLabel="Go to Inbox"
          onAction={() => navigate("/chat")}
        />
      </div>
    )
  }

  // The listing can be RLS-hidden from a buyer once the seller marks it
  // sold (see BUGS.md #14/#15) — fall back to a plain label rather than
  // crashing on a null embed.
  const listingTitle = conversation.listing?.title ?? "a listing that is no longer available"

  return (
    <div className="max-w-xl mx-auto h-[600px] flex flex-col justify-between border border-border rounded-card bg-surface-raised overflow-hidden">
      <div className="p-4 bg-surface border-b border-border flex items-center gap-3">
        <Avatar name={otherParty.display_name} src={getAvatarPublicUrl(otherParty.avatar_url)} />
        <div>
          <h1 className="font-bold text-text">{otherParty.display_name}</h1>
          <p className="text-xs text-text-muted">{listingTitle}</p>
        </div>
      </div>

      <div
        role="log"
        aria-live="polite"
        aria-label={`Conversation with ${otherParty.display_name} about ${listingTitle}`}
        className="flex-1 p-4 overflow-y-auto space-y-4 bg-surface"
      >
        {messagesQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">
            No messages yet — say hello about {listingTitle}.
          </p>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === user.id
            return (
              <div
                key={message.id}
                className={`flex items-end gap-2 max-w-[80%] ${isOwn ? "ml-auto justify-end" : ""}`}
              >
                {!isOwn && (
                  <Avatar
                    name={message.profiles.display_name}
                    src={getAvatarPublicUrl(message.profiles.avatar_url)}
                    size="sm"
                  />
                )}
                <div
                  className={
                    isOwn
                      ? "bg-primary text-primary-foreground p-3 rounded-lg text-sm"
                      : "bg-surface-raised text-text p-3 rounded-lg border border-border text-sm"
                  }
                >
                  <span className="sr-only">{isOwn ? "You" : message.profiles.display_name} said: </span>
                  {message.body}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 bg-surface border-t border-border flex gap-3">
        <label htmlFor="chat-composer" className="sr-only">
          Write a message
        </label>
        <input
          id="chat-composer"
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write your message here"
          autoComplete="off"
          className="flex-1 px-3 py-2 bg-surface text-text border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button type="submit" variant="primary" disabled={!draft.trim()} isLoading={isSending}>
          Send
        </Button>
      </form>
    </div>
  )
}
