import type { OrderStatus } from "../types/database"
import type { BadgeProps } from "../components/ui/Badge"

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

export const ORDER_STATUS_BADGE_VARIANT: Record<OrderStatus, NonNullable<BadgeProps["variant"]>> = {
  pending: "warning",
  confirmed: "info",
  shipped: "primary",
  delivered: "success",
  cancelled: "danger",
}
