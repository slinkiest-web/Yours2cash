import React from "react"
import { Link, useParams } from "react-router-dom"
import { MapPin, AlertCircle } from "lucide-react"
import { Card } from "../components/ui/Card"
import { Badge } from "../components/ui/Badge"
import { Avatar } from "../components/ui/Avatar"
import { EmptyState } from "../components/ui/EmptyState"
import { formatNaira } from "../utils/formatters"

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
