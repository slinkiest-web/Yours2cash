import React from "react"
import { Link, useParams } from "react-router-dom"
import { MapPin, ShoppingBag, Inbox, AlertCircle } from "lucide-react"
import { Button } from "../components/ui/Button"
import { Card } from "../components/ui/Card"
import { Badge } from "../components/ui/Badge"
import { Avatar } from "../components/ui/Avatar"
import { EmptyState } from "../components/ui/EmptyState"
import { formatNaira } from "../utils/formatters"

export const ChatInboxPage: React.FC = () => {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-serif text-text">Conversations</h1>
        <p className="text-text-muted text-sm mt-1">Talk to buyers and sellers about listed items.</p>
      </div>

      <div className="space-y-4">
        {[
          {
            id: "1",
            name: "Eniola Ademowo",
            message: "Is the price negotiable?",
            time: "10m ago",
            unread: true,
          },
          {
            id: "2",
            name: "Chidi Nnamdi",
            message: "I will confirm tomorrow, thanks",
            time: "2h ago",
            unread: false,
          },
        ].map((chat) => (
          <Link key={chat.id} to={`/chat/${chat.id}`} className="block">
            <Card hoverEffect className="p-4 flex items-center gap-4">
              <Avatar name={chat.name} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-bold text-text truncate">{chat.name}</h3>
                  <span className="text-xs text-text-muted shrink-0">{chat.time}</span>
                </div>
                <p className={`text-sm truncate ${chat.unread ? "font-bold text-text" : "text-text-muted"}`}>
                  {chat.message}
                </p>
              </div>
              {chat.unread && <div className="w-2.5 h-2.5 bg-primary rounded-full shrink-0" />}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export const ChatThreadPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="max-w-xl mx-auto h-[600px] flex flex-col justify-between border border-border rounded-card bg-surface-raised overflow-hidden">
      <div className="p-4 bg-surface border-b border-border flex items-center gap-3">
        <Avatar name="Eniola Ademowo" />
        <div>
          <h2 className="font-bold text-text">Eniola Ademowo (Thread {id})</h2>
          <p className="text-xs text-text-muted">Soundbar System listing</p>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-surface">
        <div className="flex items-end gap-2 max-w-[80%]">
          <Avatar name="Eniola Ademowo" size="sm" />
          <div className="bg-surface-raised text-text p-3 rounded-lg border border-border text-sm">
            Hello, is the premium soundbar system still available for pickup?
          </div>
        </div>

        <div className="flex items-end gap-2 max-w-[80%] ml-auto justify-end">
          <div className="bg-primary text-primary-foreground p-3 rounded-lg text-sm">
            Yes, it is available, you can inspect it in Lagos, Ikeja.
          </div>
        </div>
      </div>

      <div className="p-4 bg-surface border-t border-border flex gap-3">
        <input
          type="text"
          placeholder="Write your message here"
          className="flex-1 px-3 py-2 bg-surface text-text border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button variant="primary">Send</Button>
      </div>
    </div>
  )
}

export const OrdersPage: React.FC = () => {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-serif text-text">Orders Tracker</h1>
        <p className="text-text-muted text-sm mt-1">Track mock orders, rates are informational with no money moving.</p>
      </div>

      <div className="space-y-4">
        {[
          {
            id: "1",
            title: "Premium Soundbar System",
            price: 85000,
            status: "pending",
            date: "Today",
          },
          {
            id: "2",
            title: "Vintage Leather Boots",
            price: 24000,
            status: "delivered",
            date: "Yesterday",
          },
        ].map((order) => (
          <Card key={order.id} className="p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-text">{order.title}</h3>
                <span className="text-xs text-text-muted">{order.date}</span>
              </div>
              <Badge variant={order.status === "delivered" ? "success" : "warning"}>{order.status}</Badge>
            </div>
            <div className="flex justify-between items-center border-t border-border pt-4">
              <span className="text-lg font-bold text-serif text-primary">{formatNaira(order.price)}</span>
              {order.status === "delivered" ? (
                <Button variant="secondary" size="sm">
                  Rate Seller
                </Button>
              ) : (
                <Button variant="destructive" size="sm">
                  Cancel Order
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export const SellerDashboardPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="border-b border-border pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-serif text-text">Seller Dashboard</h1>
          <p className="text-text-muted text-sm mt-1">Manage listings and completed order earnings.</p>
        </div>
        <div className="bg-surface-raised border border-border p-4 rounded-card text-right">
          <span className="text-xs text-text-muted block">Mock Earnings</span>
          <span className="text-xl font-bold text-serif text-primary">{formatNaira(109000)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold text-serif text-text flex items-center gap-2">
            <Inbox className="w-5 h-5 text-primary" /> Active Listings
          </h2>
          <div className="space-y-3">
            {[
              { id: "1", title: "Premium Soundbar System", price: 85000, status: "active" },
              { id: "2", title: "Smart Watch Series 8", price: 110000, status: "sold" },
            ].map((listing) => (
              <div key={listing.id} className="flex justify-between items-center border-b border-border pb-2 last:border-0 last:pb-0">
                <div>
                  <span className="font-semibold text-text block">{listing.title}</span>
                  <span className="text-xs text-text-muted">{formatNaira(listing.price)}</span>
                </div>
                <Badge variant={listing.status === "active" ? "primary" : "secondary"}>{listing.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold text-serif text-text flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" /> Customer Orders
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-semibold text-text block">Smart Watch Series 8</span>
                <span className="text-xs text-text-muted">Buyer, Chidi Nnamdi</span>
              </div>
              <Button size="sm">Fulfill</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export const PublicProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Card className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
        <Avatar name="Eniola Ademowo" size="lg" className="w-20 h-20 text-2xl" />
        <div className="space-y-2 flex-1">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-serif text-text">Eniola Ademowo</h1>
              <span className="text-sm text-text-muted flex items-center gap-1 justify-center md:justify-start">
                <MapPin className="w-4 h-4" /> Lagos, Ikeja
              </span>
            </div>
            <div className="text-right">
              <Badge variant="primary">Rating, 4.8</Badge>
              <span className="text-xs text-text-muted block mt-1">12 completed reviews</span>
            </div>
          </div>
          <p className="text-text-muted text-sm">
            Welcome to my profile, I list electronics and premium audio systems, reach out with questions. (Profile ID: {id})
          </p>
        </div>
      </Card>

      <section className="space-y-6">
        <h2 className="text-xl font-bold text-serif text-text">Seller Listings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link to="/product/1" className="group block">
            <Card hoverEffect className="flex flex-col h-full">
              <div className="aspect-video bg-border w-full flex items-center justify-center text-text-muted font-bold text-serif">
                Product Image
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-text group-hover:text-primary transition-colors">
                    Premium Soundbar System
                  </h3>
                  <Badge>like new</Badge>
                </div>
                <div className="text-lg font-bold text-serif text-primary mt-2">
                  {formatNaira(85000)}
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  )
}

export const NotFoundPage: React.FC = () => {
  return (
    <div className="py-12">
      <EmptyState
        icon={AlertCircle}
        title="Page not found"
        description="The page you requested does not exist or has been removed from Yours2Cash."
        actionLabel="Go to Home"
        onAction={() => {
          window.location.href = "/"
        }}
      />
    </div>
  )
}
