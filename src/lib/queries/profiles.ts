/**
 * Query helpers for profiles.
 */
import { supabase } from "../supabase"
import type { Profile, UpdateTables } from "../../types/database"
import type { QueryResult } from "./types"

export async function fetchProfile(userId: string): Promise<QueryResult<Profile>> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()

  return { data, error: error?.message ?? null }
}

export async function updateProfile(
  userId: string,
  payload: UpdateTables<"profiles">
): Promise<QueryResult<Profile>> {
  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select()
    .single()

  return { data, error: error?.message ?? null }
}

export async function uploadAvatar(
  userId: string,
  file: File
): Promise<QueryResult<string>> {
  const ext = file.name.split(".").pop()
  const path = `${userId}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true })

  if (uploadError) {
    return { data: null, error: uploadError.message }
  }

  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(path)

  await updateProfile(userId, { avatar_url: path })

  return { data: urlData.publicUrl, error: null }
}

export function getAvatarPublicUrl(path: string | null | undefined): string | undefined {
  if (!path) {
    return undefined
  }
  const { data } = supabase.storage.from("avatars").getPublicUrl(path)
  return data.publicUrl
}
