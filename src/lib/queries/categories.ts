/**
 * Query helpers for categories.
 *
 * Categories are a fixed, seeded lookup set (see migration 003) with no
 * client writes, so this module only ever reads.
 */
import { supabase } from "../supabase"
import type { Category } from "../../types/database"
import type { QueryResult } from "./types"

export async function fetchCategories(): Promise<QueryResult<Category[]>> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })

  return { data, error: error?.message ?? null }
}
