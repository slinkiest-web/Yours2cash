import React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "info"
}

export const Badge: React.FC<BadgeProps> = ({ variant = "secondary", children, className = "", ...props }) => {
  const baseStyle =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors"

  const variantStyles = {
    primary: "bg-primary text-primary-foreground",
    secondary: "bg-surface-raised text-text border border-border",
    success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  }

  return (
    <span className={`${baseStyle} ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </span>
  )
}
