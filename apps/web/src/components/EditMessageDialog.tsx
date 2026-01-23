'use client'

import { useState } from 'react'
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
  isLoading: boolean
  onClose: () => void
  onSave: (messageId: string, content: string) => Promise<void>
}

export function EditMessageDialog({ 
  isOpen, 
  messageId,
  initialContent,
  isLoading,
  onClose, 
  onSave 
}: EditMessageDialogProps) {
  const [content, setContent] = useState(initialContent)

  const handleSave = async () => {
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
            disabled={isLoading || !content.trim() || content === initialContent}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}