/**
 * Query helpers for reviews.
 */
import { supabase } from "../supabase"
import type { Review, ReviewWithReviewer } from "../../types/database"
import type { QueryResult } from "./types"

export async function fetchReviewsForSeller(
  sellerId: string
): Promise<QueryResult<ReviewWithReviewer[]>> {
  const { data, error } = await supabase
    .from("reviews")
    .select(`
      *,
      profiles!reviews_reviewer_id_fkey(id, display_name, avatar_url)
    `)
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })

  return { data: data as ReviewWithReviewer[] | null, error: error?.message ?? null }
}

export async function fetchReviewByOrder(
  orderId: string
): Promise<QueryResult<Review>> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle()

  return { data, error: error?.message ?? null }
}

export async function createReview(
  orderId: string,
  reviewerId: string,
  sellerId: string,
  rating: number,
  comment?: string
): Promise<QueryResult<Review>> {
  const { data, error } = await supabase
    .from("reviews")
    .insert({ order_id: orderId, reviewer_id: reviewerId, seller_id: sellerId, rating, comment })
    .select()
    .single()

  return { data, error: error?.message ?? null }
}

export async function updateReview(
  reviewId: string,
  rating: number,
  comment?: string
): Promise<QueryResult<Review>> {
  const { data, error } = await supabase
    .from("reviews")
    .update({ rating, comment })
    .eq("id", reviewId)
    .select()
    .single()

  return { data, error: error?.message ?? null }
}
