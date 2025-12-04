import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export function useAdmin() {
  const { user, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminChecked, setAdminChecked] = useState(false)

  useEffect(() => {
    let mounted = true

    async function checkAdmin() {
      // Wait for auth to finish loading first
      if (authLoading) {
        console.log('[useAdmin] Auth still loading, waiting...')
        return
      }

      console.log('[useAdmin] checkAdmin called, user:', user?.id)
      if (!user) {
        console.log('[useAdmin] No user, setting isAdmin=false')
        setIsAdmin(false)
        setAdminChecked(true)
        return
      }

      // Use the is_admin function which bypasses RLS
      console.log('[useAdmin] Calling is_admin RPC for user:', user.id)
      const { data, error } = await supabase.rpc('is_admin', { user_id: user.id })
      console.log('[useAdmin] RPC result:', { data, error })

      if (!mounted) {
        console.log('[useAdmin] Component unmounted, aborting')
        return
      }

      if (error) {
        console.error('[useAdmin] Admin check error:', error)
        // Fallback to direct query
        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()

        console.log('[useAdmin] Fallback profile query result:', profileData)
        if (!mounted) return
        setIsAdmin(profileData?.is_admin ?? false)
      } else {
        console.log('[useAdmin] Setting isAdmin to:', data)
        setIsAdmin(data ?? false)
      }

      setAdminChecked(true)
      console.log('[useAdmin] Done, adminChecked=true')
    }

    checkAdmin()

    return () => {
      mounted = false
    }
  }, [user, authLoading])

  // Loading if auth is loading OR we haven't checked admin status yet
  const loading = authLoading || !adminChecked

  console.log('[useAdmin] Returning - loading:', loading, 'isAdmin:', isAdmin, 'authLoading:', authLoading, 'adminChecked:', adminChecked)

  return { isAdmin, loading }
}
