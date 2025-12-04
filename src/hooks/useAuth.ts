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
        // Check for pending auth tokens from magic link redirect (see index.html)
        const pendingTokens = sessionStorage.getItem('pending-auth-tokens')
        if (pendingTokens) {
          console.log('[Auth] Found pending auth tokens from magic link')
          sessionStorage.removeItem('pending-auth-tokens')

          const { access_token, refresh_token } = JSON.parse(pendingTokens)
          console.log('[Auth] Calling setSession() with tokens')

          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          })

          if (setSessionError) {
            console.error('[Auth] setSession error:', setSessionError)
            throw setSessionError
          }

          console.log('[Auth] Session established successfully:', data.session?.user?.email)

          if (!mounted) return
          setState({
            session: data.session,
            user: data.session?.user ?? null,
            loading: false,
            error: null,
          })
          return
        }

        // Normal flow: check existing session
        console.log('[Auth] Checking existing session')
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('[Auth] getSession result:', session ? `user: ${session.user?.email}` : 'no session')

        if (error) throw error
        if (!mounted) return

        setState({
          session,
          user: session?.user ?? null,
          loading: false,
          error: null,
        })
      } catch (err) {
        console.error('[Auth] Error during auth init:', err)
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
