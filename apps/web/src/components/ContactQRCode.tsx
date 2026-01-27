'use client'

import QRCode from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

type ContactQRCodeProps = {
  userId?: string
  username?: string
  displayName?: string
}

export const ContactQRCode = ({ userId, username, displayName }: ContactQRCodeProps) => {
  const { toast } = useToast()
  if (!userId) {
    return null
  }

  const codeValue = `openchat:user:${userId}`
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeValue)
      toast({
        variant: 'success',
        title: 'Code copied',
        description: 'Share your QR code with friends to add you.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Copy failed',
        description: 'Unable to copy QR code. Please try again.',
      })
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Your QR code</p>
        <p className="text-xs text-gray-500">
          {displayName || username ? `${displayName || ''} @${username || ''}` : 'Share to add you'}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white p-2">
          <QRCode value={codeValue} size={120} bgColor="#ffffff" fgColor="#111827" />
        </div>
        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
          <p>Let others scan this code to send you a contact request.</p>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            Copy QR code
          </Button>
        </div>
      </div>
    </div>
  )
}
