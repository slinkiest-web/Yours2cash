import React from "react"

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  name?: string
  size?: "sm" | "md" | "lg"
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "User avatar",
  name = "",
  size = "md",
  className = "",
  ...props
}) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-xl",
  }

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden bg-primary text-primary-foreground font-semibold uppercase shrink-0 ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none"
          }}
        />
      ) : (
        <span>{initials || "U"}</span>
      )}
    </div>
  )
}
