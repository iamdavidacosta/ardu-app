import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { Session } from '@supabase/supabase-js'
import { clearDraftBackup } from '../lib/draft-backup'
import { getSupabase } from '../lib/supabase'
import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const client = getSupabase()
    void client.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    loading,
    async signIn(email, password) {
      const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw new Error('El correo o la contraseña no son correctos.')
    },
    async signOut() {
      const { error } = await getSupabase().auth.signOut()
      if (error) throw new Error('No fue posible cerrar la sesión.')
      clearDraftBackup()
    },
  }), [loading, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
