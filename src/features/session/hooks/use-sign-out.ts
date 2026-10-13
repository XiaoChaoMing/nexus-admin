import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { logout } from '@/features/session/lib/session'

/** Logout (POST /v1/auth/logout), drop every cached admin query, back to /login. */
export function useSignOut() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [pending, setPending] = useState(false)

  const signOut = async () => {
    setPending(true)
    await logout()
    queryClient.clear()
    setPending(false)
    navigate('/login', { replace: true })
  }

  return { signOut, pending }
}
