import React from "react"
import { Card } from "../ui/Card"
import { Skeleton } from "../ui/Skeleton"

export const ListingCardSkeleton: React.FC = () => (
  <Card className="flex flex-col h-full" aria-hidden="true">
    <Skeleton className="aspect-video w-full rounded-none" />
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-start gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-5 w-1/2 mt-2" />
    </div>
  </Card>
)
