import React, { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { getSession, onAuthStateChange, signOut as signOutHelper } from "../lib/auth"
import { fetchProfile } from "../lib/queries/profiles"
import type { Profile } from "../types/database"

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  /** A profile always exists (created by a DB trigger on signup) but starts with an empty state. */
  profileComplete: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await fetchProfile(userId)
    setProfile(data)
  }, [])

  useEffect(() => {
    let active = true

    getSession().then(async (initialSession) => {
      if (!active) return
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      if (initialSession?.user) {
        await loadProfile(initialSession.user.id)
      }
      if (active) {
        setLoading(false)
      }
    })

    const { data: subscriptionData } = onAuthStateChange(async (nextUser, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setUser(nextUser)
      if (nextUser) {
        await loadProfile(nextUser.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      active = false
      subscriptionData.subscription.unsubscribe()
    }
  }, [loadProfile])

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfile(user.id)
    }
  }, [user, loadProfile])

  const signOut = useCallback(async () => {
    await signOutHelper()
    setUser(null)
    setSession(null)
    setProfile(null)
  }, [])

  const profileComplete = !!profile?.state

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, profileComplete, refreshProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
