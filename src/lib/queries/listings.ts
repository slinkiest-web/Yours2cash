/**
 * Query helpers for listings.
 *
 * Each function returns typed data and a structured error string so callers
 * can handle failures without inspecting raw Supabase error objects.
 */
import { supabase } from "../supabase"
import type {
  Listing,
  ListingWithImages,
  ListingWithSeller,
  InsertTables,
  UpdateTables,
} from "../../types/database"
import type { QueryResult } from "./types"

export async function fetchFeaturedListings(): Promise<QueryResult<ListingWithImages[]>> {
  const { data, error } = await supabase
    .from("listings")
    .select("*, listing_images(*)")
    .eq("status", "active")
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(12)

  return { data: data as ListingWithImages[] | null, error: error?.message ?? null }
}

export async function fetchRecentListings(limit = 24): Promise<QueryResult<ListingWithImages[]>> {
  const { data, error } = await supabase
    .from("listings")
    .select("*, listing_images(*)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit)

  return { data: data as ListingWithImages[] | null, error: error?.message ?? null }
}

export interface ListingFilters {
  query?: string
  categoryId?: string
  state?: string
  city?: string
  condition?: string
  minPrice?: number
  maxPrice?: number
  sort?: "newest" | "price_asc" | "price_desc"
}

export async function searchListings(
  filters: ListingFilters
): Promise<QueryResult<ListingWithImages[]>> {
  let q = supabase
    .from("listings")
    .select("*, listing_images(*)")
    .eq("status", "active")

  if (filters.query) {
    q = q.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`)
  }
  if (filters.categoryId) {
    q = q.eq("category_id", filters.categoryId)
  }
  if (filters.state) {
    q = q.eq("state", filters.state)
  }
  if (filters.city) {
    q = q.eq("city", filters.city)
  }
  if (filters.condition) {
    q = q.eq("condition", filters.condition as Listing["condition"])
  }
  if (filters.minPrice !== undefined) {
    q = q.gte("price", filters.minPrice)
  }
  if (filters.maxPrice !== undefined) {
    q = q.lte("price", filters.maxPrice)
  }

  const sort = filters.sort ?? "newest"
  if (sort === "newest") {
    q = q.order("created_at", { ascending: false })
  } else if (sort === "price_asc") {
    q = q.order("price", { ascending: true })
  } else {
    q = q.order("price", { ascending: false })
  }

  const { data, error } = await q.limit(50)
  return { data: data as ListingWithImages[] | null, error: error?.message ?? null }
}

export async function fetchListingById(id: string): Promise<QueryResult<ListingWithSeller>> {
  const { data, error } = await supabase
    .from("listings")
    .select("*, listing_images(*), profiles!listings_seller_id_fkey(*)")
    .eq("id", id)
    .single()

  return { data: data as ListingWithSeller | null, error: error?.message ?? null }
}

export async function fetchListingsBySeller(sellerId: string): Promise<QueryResult<ListingWithImages[]>> {
  const { data, error } = await supabase
    .from("listings")
    .select("*, listing_images(*)")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })

  return { data: data as ListingWithImages[] | null, error: error?.message ?? null }
}

export async function fetchListingsByCategory(
  categoryId: string
): Promise<QueryResult<ListingWithImages[]>> {
  const { data, error } = await supabase
    .from("listings")
    .select("*, listing_images(*)")
    .eq("status", "active")
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false })

  return { data: data as ListingWithImages[] | null, error: error?.message ?? null }
}

export async function createListing(
  payload: InsertTables<"listings">
): Promise<QueryResult<Listing>> {
  const { data, error } = await supabase
    .from("listings")
    .insert(payload)
    .select()
    .single()

  return { data, error: error?.message ?? null }
}

export async function updateListing(
  id: string,
  payload: UpdateTables<"listings">
): Promise<QueryResult<Listing>> {
  const { data, error } = await supabase
    .from("listings")
    .update(payload)
    .eq("id", id)
    .select()
    .single()

  return { data, error: error?.message ?? null }
}

export async function deleteListing(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("listings")
    .update({ status: "removed" })
    .eq("id", id)

  return { error: error?.message ?? null }
}

export async function addListingImage(
  listingId: string,
  storagePath: string,
  position: number
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("listing_images")
    .insert({ listing_id: listingId, storage_path: storagePath, position })

  return { error: error?.message ?? null }
}

export async function uploadListingPhoto(
  listingId: string,
  file: File,
  position: number
): Promise<QueryResult<string>> {
  const ext = file.name.split(".").pop()
  const path = `${listingId}/${position}-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("listing-images")
    .upload(path, file, { upsert: true })

  if (uploadError) {
    return { data: null, error: uploadError.message }
  }

  const { data: urlData } = supabase.storage
    .from("listing-images")
    .getPublicUrl(path)

  await addListingImage(listingId, path, position)

  return { data: urlData.publicUrl, error: null }
}

export function getListingImagePublicUrl(path: string): string {
  const { data } = supabase.storage.from("listing-images").getPublicUrl(path)
  return data.publicUrl
}

export async function deleteListingImage(
  imageId: string,
  storagePath: string
): Promise<{ error: string | null }> {
  const { error: storageError } = await supabase.storage
    .from("listing-images")
    .remove([storagePath])

  if (storageError) {
    return { error: storageError.message }
  }

  const { error } = await supabase.from("listing_images").delete().eq("id", imageId)

  return { error: error?.message ?? null }
}
