'use client'

import { useMemo, useState } from 'react'
import QRCode from 'qrcode.react'
import { Copy, RefreshCcw, Share2, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { chatAPI, type ChatInvitation } from '@/lib/api'

const EXPIRY_OPTIONS = [
  { label: '24 hours', value: 24 },
  { label: '7 days', value: 168 },
  { label: '30 days', value: 720 },
]

type GroupInviteModalProps = {
  isOpen: boolean
  onClose: () => void
  chatId: string
  groupName: string
}

export const GroupInviteModal = ({ isOpen, onClose, chatId, groupName }: GroupInviteModalProps) => {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [invitation, setInvitation] = useState<ChatInvitation | null>(null)
  const [expiresInHours, setExpiresInHours] = useState(EXPIRY_OPTIONS[1].value)

  const inviteUrl = useMemo(() => {
    if (!invitation) return ''
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/invite/${invitation.code}`
  }, [invitation])

  const handleCreateInvite = async () => {
    try {
      setIsLoading(true)
      const response = await chatAPI.createGroupInvitation(chatId, { expiresInHours })
      setInvitation(response.data)
      toast({
        title: 'Invite ready',
        description: 'Share the link or QR code to add members.',
        variant: 'success'
      })
    } catch (error: any) {
      toast({
        title: 'Invite failed',
        description: error.response?.data?.error || error.message || 'Unable to create invite.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      toast({
        title: 'Link copied',
        description: 'Share it with new group members.',
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Unable to copy the invite link. Try again.',
        variant: 'destructive'
      })
    }
  }

  const handleShare = async () => {
    if (!inviteUrl) return
    if (!navigator.share) {
      await handleCopy()
      return
    }
    try {
      await navigator.share({
        title: `Join ${groupName} on OpenChat`,
        text: `Join the group ${groupName} on OpenChat.`,
        url: inviteUrl
      })
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      toast({
        title: 'Share failed',
        description: 'Unable to share invite. Try copying instead.',
        variant: 'destructive'
      })
    }
  }

  const handleRevoke = async () => {
    if (!invitation) return
    try {
      setIsLoading(true)
      await chatAPI.revokeInvitation(chatId, invitation.id)
      setInvitation(null)
      toast({
        title: 'Invite revoked',
        description: 'The invite link can no longer be used.',
        variant: 'success'
      })
    } catch (error: any) {
      toast({
        title: 'Revoke failed',
        description: error.response?.data?.error || error.message || 'Unable to revoke invite.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const expiresAtLabel = invitation?.expiresAt
    ? new Date(invitation.expiresAt).toLocaleString()
    : 'Not set'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle>Invite members</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Group</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{groupName}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Link expires</label>
              <select
                value={expiresInHours}
                onChange={(event) => setExpiresInHours(Number(event.target.value))}
                className="h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100"
                disabled={isLoading}
              >
                {EXPIRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={handleCreateInvite}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              {invitation ? 'Create new link' : 'Create invite link'}
            </Button>
          </div>

          {invitation ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs text-gray-500 mb-2">Invite link</p>
                <div className="flex flex-col gap-2">
                  <div className="rounded-md bg-gray-100 dark:bg-gray-800 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 break-all">
                    {inviteUrl}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={handleCopy} className="flex items-center gap-1">
                      <Copy className="h-4 w-4" />
                      Copy link
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleShare} className="flex items-center gap-1">
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRevoke}
                      className="flex items-center gap-1 text-red-600 border-red-200 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Revoke
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white p-2">
                  <QRCode value={inviteUrl} size={140} bgColor="#ffffff" fgColor="#111827" />
                </div>
                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                  <p>Scan to join instantly.</p>
                  <p>Expires: {expiresAtLabel}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Create an invite link to share with new members.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
