import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { Profile, Role } from '../types'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  inactivity: () => Promise<void>
  // Idle warning UI
  showIdleWarning: boolean
  warningSecondsLeft: number
  extendSession: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function fetchProfile(userId: string, userEmail?: string, userMetadata?: Record<string, any>): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load profile', error)
    return null
  }
  
  // If profile doesn't exist, auto-create it with default values
  if (!data) {
    return await createDefaultProfile(userId, userEmail, userMetadata)
  }
  
  return data as Profile
}

async function createDefaultProfile(userId: string, userEmail?: string, userMetadata?: Record<string, any>): Promise<Profile | null> {
  const fullName = userMetadata?.full_name || userEmail?.split('@')[0] || 'Clinic Staff'
  
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      full_name: fullName,
      role: 'clinic_staff',
      created_at: new Date().toISOString()
    })
    .select()
    .maybeSingle()
  
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to auto-create profile', error)
    return null
  }
  
  return data as Profile | null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [authReady, setAuthReady] = useState(false)

  // Session expiry settings (ms). Can be overridden via env vars.
  const IDLE_TIMEOUT_MS = Number(import.meta.env.VITE_IDLE_TIMEOUT_MS) || 30 * 60 * 1000 // 30 minutes
  const MAX_SESSION_MS = Number(import.meta.env.VITE_MAX_SESSION_MS) || 8 * 60 * 60 * 1000 // 8 hours absolute
  const IDLE_WARNING_MS = Number(import.meta.env.VITE_IDLE_WARNING_MS) || 60 * 1000 // 1 minute warning

  const idleTimerRef = useRef<number | null>(null)
  const absoluteTimerRef = useRef<number | null>(null)
  const warningTimerRef = useRef<number | null>(null)
  const logoutTimerRef = useRef<number | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const [showIdleWarning, setShowIdleWarning] = useState(false)
  const [warningSecondsLeft, setWarningSecondsLeft] = useState(0)
  const warningIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    const restore = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setAuthReady(true)
    }

    void restore()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
      setAuthReady(true)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    // avoid user profile loading while auth state is still being initialized
    if (!authReady) {
      setLoading(true)
      return
    }

    const load = async () => {
      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }
      setLoading(true)
      const p = await fetchProfile(user.id, user.email, user.user_metadata)
      setProfile(p)
      setLoading(false)
    }
    void load()
  }, [user, authReady])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      throw error
    }
    toast.success('Signed in successfully')
  }

  // Helper: clear timers
  const clearTimers = () => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
    if (absoluteTimerRef.current) window.clearTimeout(absoluteTimerRef.current)
    idleTimerRef.current = null
    absoluteTimerRef.current = null
  }

  // Sign out wrapper that clears timers
  const doSignOut = async () => {
    clearTimers()
    const { error } = await supabase.auth.signOut()
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Sign out failed', error)
      toast.error(error.message)
      return
    }
    toast.success('Signed out')
    setProfile(null)
    setUser(null)
    setSession(null)
  }

  const signOut = async () => doSignOut()

  const inactivity = async () => {
    // Explicit inactivity-triggered expiration; equivalent to idle timeout being hit
    toast('Signed out due to inactivity')
    await doSignOut()
  }

  // Reset idle timer (call on user activity)
  const resetIdleTimer = () => {
    lastActivityRef.current = Date.now()
    // clear existing timers
    if (warningTimerRef.current) window.clearTimeout(warningTimerRef.current)
    if (logoutTimerRef.current) window.clearTimeout(logoutTimerRef.current)
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
    if (warningIntervalRef.current) window.clearInterval(warningIntervalRef.current)
    setShowIdleWarning(false)

    // Schedule warning to show at (IDLE_TIMEOUT_MS - IDLE_WARNING_MS)
    const timeUntilWarning = Math.max(0, IDLE_TIMEOUT_MS - IDLE_WARNING_MS)
    idleTimerRef.current = window.setTimeout(() => {
      setShowIdleWarning(true)
      setWarningSecondsLeft(Math.ceil(IDLE_WARNING_MS / 1000))

      // start countdown interval
      warningIntervalRef.current = window.setInterval(() => {
        setWarningSecondsLeft((s) => {
          if (s <= 1) {
            if (warningIntervalRef.current) window.clearInterval(warningIntervalRef.current)
            return 0
          }
          return s - 1
        })
      }, 1000)

      // schedule actual logout after warning period
      logoutTimerRef.current = window.setTimeout(() => {
        toast('Signed out due to inactivity')
        void doSignOut()
      }, IDLE_WARNING_MS)
    }, timeUntilWarning)
  }

  const extendSession = () => {
    // user chose to stay signed in; reset timers and hide warning
    if (warningIntervalRef.current) window.clearInterval(warningIntervalRef.current)
    if (warningTimerRef.current) window.clearTimeout(warningTimerRef.current)
    if (logoutTimerRef.current) window.clearTimeout(logoutTimerRef.current)
    setShowIdleWarning(false)
    setWarningSecondsLeft(0)
    resetIdleTimer()
  }

  // Schedule an absolute session end timer (either from Supabase session expiry or configured max)
  const scheduleAbsoluteTimer = (s: Session | null) => {
    if (absoluteTimerRef.current) window.clearTimeout(absoluteTimerRef.current)
    let msLeft = MAX_SESSION_MS
    try {
      // Supabase session may include `expires_at` (seconds since epoch)
      const expiresAt = (s as any)?.expires_at
      if (expiresAt) {
        const expiresMs = Number(expiresAt) * 1000
        msLeft = Math.max(0, expiresMs - Date.now())
      }
    } catch (e) {
      // fallback to MAX_SESSION_MS
      msLeft = MAX_SESSION_MS
    }
    absoluteTimerRef.current = window.setTimeout(() => {
      toast('Session expired')
      void doSignOut()
    }, msLeft)
  }

  // Activity listeners to keep session alive
  useEffect(() => {
    const onActivity = () => resetIdleTimer()
    const events: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'click', 'touchstart']
    events.forEach((ev) => window.addEventListener(ev, onActivity))
    // initialize
    resetIdleTimer()
    return () => events.forEach((ev) => window.removeEventListener(ev, onActivity))
  }, [])

  // When session changes, schedule timers or clear them
  useEffect(() => {
    if (session) {
      scheduleAbsoluteTimer(session)
      resetIdleTimer()
    } else {
      clearTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signIn,
    signOut,
    inactivity,
    showIdleWarning,
    warningSecondsLeft,
    extendSession
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

