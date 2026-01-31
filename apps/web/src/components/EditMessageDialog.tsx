'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface EditMessageDialogProps {
  isOpen: boolean
  messageId: string
  initialContent: string
  createdAt: string
  isLoading: boolean
  onClose: () => void
  onSave: (messageId: string, content: string) => Promise<void>
}

export function EditMessageDialog({ 
  isOpen, 
  messageId,
  initialContent,
  createdAt,
  isLoading,
  onClose, 
  onSave 
}: EditMessageDialogProps) {
  const [content, setContent] = useState(initialContent)
  const [remainingMs, setRemainingMs] = useState(0)

  const editWindowMs = 5 * 60 * 1000

  const calculateRemaining = () => {
    const createdAtMs = new Date(createdAt).getTime()
    const elapsed = Date.now() - createdAtMs
    return Math.max(0, editWindowMs - elapsed)
  }

  useEffect(() => {
    if (!isOpen) return
    setContent(initialContent)
    setRemainingMs(calculateRemaining())
    const timer = window.setInterval(() => {
      setRemainingMs(calculateRemaining())
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isOpen, createdAt])

  const remainingLabel = useMemo(() => {
    const totalSeconds = Math.ceil(remainingMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [remainingMs])

  const isExpired = remainingMs <= 0

  const handleSave = async () => {
    if (isExpired) {
      onClose()
      return
    }
    if (content.trim() && content !== initialContent) {
      await onSave(messageId, content.trim())
    }
    onClose()
  }

  const handleClose = () => {
    setContent(initialContent)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Message</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {isExpired ? 'Editing window expired' : `Time remaining: ${remainingLabel}`}
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your message..."
            className="min-h-[100px] resize-none"
            autoFocus
            disabled={isLoading}
          />
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isLoading || isExpired || !content.trim() || content === initialContent}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
