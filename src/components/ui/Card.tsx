import React from "react"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean
}

export const Card: React.FC<CardProps> = ({ children, hoverEffect = false, className = "", ...props }) => {
  return (
    <div
      className={`bg-surface-raised border border-border shadow-soft rounded-card overflow-hidden transition-all duration-300 ${
        hoverEffect ? "hover:scale-[1.02] hover:shadow-md hover:border-primary/20 cursor-pointer" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
