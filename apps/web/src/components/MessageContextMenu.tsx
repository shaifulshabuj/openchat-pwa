'use client'

import { useState } from 'react'
import { MoreVertical, Edit, Trash2, Reply, Copy } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface MessageContextMenuProps {
  messageId: string
  chatId: string
  content: string
  isOwn: boolean
  isEdited: boolean
  createdAt: string
  onEdit: (messageId: string, content: string) => void
  onDelete: (messageId: string) => void
  onReply: (messageId: string) => void
}

export function MessageContextMenu({ 
  messageId,
  chatId,
  content,
  isOwn, 
  isEdited,
  createdAt,
  onEdit,
  onDelete,
  onReply
}: MessageContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setIsOpen(false)
  }

  const handleEdit = () => {
    onEdit(messageId, content)
    setIsOpen(false)
  }

  const handleDelete = () => {
    onDelete(messageId)
    setIsOpen(false)
  }

  const handleReply = () => {
    onReply(messageId)
    setIsOpen(false)
  }

  // Check if message is too old to edit (24 hours)
  const messageAge = new Date().getTime() - new Date(createdAt).getTime()
  const maxAge = 24 * 60 * 60 * 1000 // 24 hours
  const canEdit = isOwn && messageAge < maxAge

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="h-3 w-3" />
          <span className="sr-only">Message options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={handleReply} className="text-sm">
          <Reply className="mr-2 h-4 w-4" />
          Reply
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleCopy} className="text-sm">
          <Copy className="mr-2 h-4 w-4" />
          Copy
        </DropdownMenuItem>
        
        {isOwn && (
          <>
            <DropdownMenuSeparator />
            
            {canEdit && (
              <DropdownMenuItem onClick={handleEdit} className="text-sm">
                <Edit className="mr-2 h-4 w-4" />
                Edit
                {isEdited && <span className="ml-auto text-xs text-gray-500">(edited)</span>}
              </DropdownMenuItem>
            )}
            
            <DropdownMenuItem 
              onClick={handleDelete} 
              className="text-sm text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}