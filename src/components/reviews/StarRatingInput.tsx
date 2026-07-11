import React, { useId } from "react"
import { Star } from "lucide-react"

export interface StarRatingInputProps {
  value: number
  onChange: (value: number) => void
  label?: string
  error?: string
  disabled?: boolean
}

const STAR_VALUES = [1, 2, 3, 4, 5]

/**
 * Interactive 1-5 star rating picker. Accessibility requirements (PRD
 * §7.12): keyboard operable (plain native <button>s — Tab + Enter/Space
 * work with no custom key handling), not color-only (filled vs. outline
 * icon state, not just a color change), and a visible text equivalent
 * (not just an aria-label) showing the current selection.
 */
export const StarRatingInput: React.FC<StarRatingInputProps> = ({
  value,
  onChange,
  label = "Rating",
  error,
  disabled = false,
}) => {
  const labelId = useId()
  const errorId = useId()

  return (
    <div className="space-y-1.5">
      <span id={labelId} className="text-sm font-medium text-text">
        {label}
      </span>
      <div
        className="flex items-center gap-1"
        role="group"
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : undefined}
      >
        {STAR_VALUES.map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            aria-pressed={star <= value}
            onClick={() => onChange(star)}
            className="p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Star
              aria-hidden="true"
              className={`w-6 h-6 ${star <= value ? "fill-current text-primary" : "text-border"}`}
            />
          </button>
        ))}
        <span className="text-sm text-text-muted ml-2">
          {value > 0 ? `${value} out of 5` : "Not rated"}
        </span>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400 font-medium">
          {error}
        </p>
      )}
    </div>
  )
}
