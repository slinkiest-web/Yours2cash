import React from "react"

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
}

export const Spinner: React.FC<SpinnerProps> = ({ size = "md", className = "", ...props }) => {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  }

  return (
    <div
      role="status"
      aria-label="loading"
      className={`animate-spin rounded-full border-solid border-t-primary border-r-transparent border-b-transparent border-l-transparent ${sizeClasses[size]} ${className}`}
      {...props}
    >
      <span className="sr-only">Loading</span>
    </div>
  )
}
