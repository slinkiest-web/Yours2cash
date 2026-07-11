import React, { useId } from "react"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", ...props }, ref) => {
    const defaultId = useId()
    const id = props.id || defaultId
    const errorId = `${id}-error`

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-text">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`px-3 py-2 bg-surface text-text border rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed min-h-[100px] ${
            error ? "border-red-500" : "border-border hover:border-text-muted"
          } ${className}`}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-sm text-red-600 dark:text-red-400 font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = "Textarea"
