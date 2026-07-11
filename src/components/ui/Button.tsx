import React from "react"
import { Spinner } from "./Spinner"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive"
  size?: "sm" | "md" | "lg"
  isLoading?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyle =
    "inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"

  const variantStyles = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    secondary: "bg-surface-raised border border-border text-text hover:bg-border",
    ghost: "bg-transparent text-text hover:bg-surface-raised hover:text-primary",
    destructive: "bg-red-700 text-white hover:bg-red-800 dark:bg-red-500 dark:text-black dark:hover:bg-red-400",
  }

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  }

  return (
    <button
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner size="sm" className="mr-2" />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  )
}
