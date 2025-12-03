import { useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: AuthError | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    // Track mounted state to prevent updates after unmount
    let mounted = true

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) throw error
        if (!mounted) return

        setState({
          session,
          user: session?.user ?? null,
          loading: false,
          error: null,
        })
      } catch (err) {
        if (!mounted) return
        setState(prev => ({
          ...prev,
          loading: false,
          error: err instanceof AuthError ? err : null,
        }))
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }))
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return {
    user: state.user,
    session: state.session,
    loading: state.loading,
    error: state.error,
    signOut,
  }
}
