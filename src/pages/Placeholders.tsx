import React from "react"
import { AlertCircle } from "lucide-react"
import { EmptyState } from "../components/ui/EmptyState"

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
