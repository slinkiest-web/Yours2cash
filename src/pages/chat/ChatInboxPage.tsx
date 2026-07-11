import React from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Inbox as InboxIcon } from "lucide-react"
import { Card } from "../../components/ui/Card"
import { Avatar } from "../../components/ui/Avatar"
import { EmptyState } from "../../components/ui/EmptyState"
import { Skeleton } from "../../components/ui/Skeleton"
import { Spinner } from "../../components/ui/Spinner"
import { useAuth } from "../../context/AuthContext"
import { fetchConversations, fetchUnreadConversationIds } from "../../lib/queries"
import { getAvatarPublicUrl } from "../../lib/queries/profiles"
import { formatRelativeTime } from "../../utils/formatters"

const INBOX_SKELETON_COUNT = 4

export const ChatInboxPage: React.FC = () => {
  const { user } = useAuth()

  const conversationsQuery = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: () => fetchConversations(user!.id),
    enabled: !!user,
  })
  const unreadQuery = useQuery({
    queryKey: ["conversations", "unread", user?.id],
    queryFn: () => fetchUnreadConversationIds(user!.id),
    enabled: !!user,
  })

  if (!user) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  const conversations = conversationsQuery.data?.data ?? []
  const unreadIds = new Set(unreadQuery.data?.data ?? [])

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-serif text-text">Conversations</h1>
        <p className="text-text-muted text-sm mt-1">Talk to buyers and sellers about listed items.</p>
      </div>

      {conversationsQuery.isLoading ? (
        <div role="status" aria-live="polite" className="space-y-4">
          <span className="sr-only">Loading conversations…</span>
          {Array.from({ length: INBOX_SKELETON_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-20" aria-hidden="true" />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title="No conversations yet"
          description="When you message a seller, or a buyer messages you about your listing, it shows up here."
        />
      ) : (
        <div className="space-y-4">
          {conversations.map((conversation) => {
            const isBuyer = conversation.buyer_id === user.id
            const otherParty = isBuyer ? conversation.seller : conversation.buyer
            const isUnread = unreadIds.has(conversation.id)
            const preview = conversation.last_message_body ?? "Say hello and ask about this listing."
            const previewPrefix = conversation.last_message_sender_id === user.id ? "You: " : ""

            return (
              <Link key={conversation.id} to={`/chat/${conversation.id}`} className="block">
                <Card hoverEffect className="p-4 flex items-center gap-4">
                  <Avatar
                    name={otherParty.display_name}
                    src={getAvatarPublicUrl(otherParty.avatar_url)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1 gap-2">
                      <h3 className="font-bold text-text truncate">{otherParty.display_name}</h3>
                      <span className="text-xs text-text-muted shrink-0">
                        {formatRelativeTime(conversation.last_message_at)}
                      </span>
                    </div>
                    <p
                      className={`text-sm truncate ${isUnread ? "font-bold text-text" : "text-text-muted"}`}
                    >
                      {previewPrefix}
                      {preview}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {conversation.listing?.title ?? "Listing no longer available"}
                    </p>
                  </div>
                  {isUnread && (
                    <span
                      className="w-2.5 h-2.5 bg-primary rounded-full shrink-0"
                      role="img"
                      aria-label="Unread messages"
                    />
                  )}
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
