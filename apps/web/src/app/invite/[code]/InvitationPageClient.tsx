'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { chatAPI } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

interface Props {
  code: string
}

export function InvitationPageClient({ code }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()
  const [isFetching, setIsFetching] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [inviteData, setInviteData] = useState<{
    invitation: { code: string; expiresAt: string; createdAt: string }
    chat: { id: string; name?: string; description?: string; avatar?: string; memberCount: number }
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!code) return
    const loadInvite = async () => {
      try {
        setIsFetching(true)
        const response = await chatAPI.validateInvitation(code)
        setInviteData(response.data)
        setError(null)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Invitation not found.')
        setInviteData(null)
      } finally {
        setIsFetching(false)
      }
    }

    loadInvite()
  }, [code])

  const handleAccept = async () => {
    if (!code) return
    try {
      setIsAccepting(true)
      const response = await chatAPI.acceptInvitation(code)
      toast({
        title: response.data.alreadyMember ? 'Already a member' : 'Joined group',
        description: response.data.alreadyMember
          ? 'You are already part of this group.'
          : 'Welcome to the group!',
        variant: 'success'
      })
      router.push(`/chat/${response.data.chatId}`)
    } catch (err: any) {
      toast({
        title: 'Unable to join',
        description: err.response?.data?.error || 'Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsAccepting(false)
    }
  }

  const handleLogin = () => {
    if (code && typeof window !== 'undefined') {
      localStorage.setItem('pending_invite_code', code)
    }
    router.push('/auth/login')
  }

  if (isFetching || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error || !inviteData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="max-w-md w-full space-y-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl px-8 py-10 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Invite unavailable</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {error || 'This invite link is invalid or has expired.'}
          </p>
          <Button onClick={() => router.push('/')}>Back to OpenChat</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl px-8 py-10">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Join group</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">You have been invited to</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {inviteData.chat.name || 'Group Chat'}
          </p>
          {inviteData.chat.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{inviteData.chat.description}</p>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300">
          <p>Members: {inviteData.chat.memberCount}</p>
          <p>Expires: {new Date(inviteData.invitation.expiresAt).toLocaleString()}</p>
        </div>

        {isAuthenticated ? (
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={handleAccept}
            disabled={isAccepting}
          >
            {isAccepting ? 'Joining...' : 'Accept invite'}
          </Button>
        ) : (
          <Button className="w-full" onClick={handleLogin}>
            Log in to accept
          </Button>
        )}
      </div>
    </div>
  )
}