import React from "react"

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  ...props
}) => <div className={`animate-pulse bg-border rounded ${className}`} {...props} />
