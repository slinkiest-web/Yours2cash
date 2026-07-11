/**
 * Authentication helpers.
 *
 * All auth operations go through this module so the rest of the app never
 * imports from the Supabase client directly for auth concerns. This keeps
 * the auth seam clean for future changes (for example adding MFA in Phase 2).
 */
import { supabase } from "./supabase"
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js"

export interface AuthResult {
  user: User | null
  session: Session | null
  error: string | null
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password })
  return {
    user: data.user,
    session: data.session,
    error: error?.message ?? null,
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return {
    user: data.user,
    session: data.session,
    error: error?.message ?? null,
  }
}

export async function signOut(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut()
  return { error: error?.message ?? null }
}

export async function resetPassword(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })
  return { error: error?.message ?? null }
}

export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  return { error: error?.message ?? null }
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser()
  return data.user
}

export function onAuthStateChange(
  callback: (user: User | null, session: Session | null, event: AuthChangeEvent) => void
) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null, session, event)
  })
}
