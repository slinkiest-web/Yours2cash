import React from "react"
import type { LucideIcon } from "lucide-react"
import { Button } from "./Button"

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-card bg-surface-raised max-w-md mx-auto ${className}`}
      {...props}
    >
      <div className="p-4 bg-surface rounded-full border border-border text-primary mb-4 shadow-soft">
        <Icon className="w-8 h-8" aria-hidden="true" />
      </div>
      <h3 className="text-xl font-bold text-serif text-text mb-2">{title}</h3>
      <p className="text-sm text-text-muted mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
