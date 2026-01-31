'use client'

import { useState } from 'react'
import { MoreVertical, Edit, Trash2, Reply, Copy, Forward } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface MessageContextMenuProps {
  messageId: string
  chatId: string
  content: string
  isOwn: boolean
  canDeleteForEveryone?: boolean
  isDeleted?: boolean
  isEdited: boolean
  createdAt: string
  isInteractionDisabled?: boolean
  onEdit: (messageId: string, content: string, createdAt: string) => void
  onDelete: (messageId: string, scope: 'me' | 'everyone') => void
  onReply: (messageId: string) => void
  onForward: (messageId: string) => void
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function MessageContextMenu({ 
  messageId,
  chatId,
  content,
  isOwn, 
  canDeleteForEveryone = false,
  isDeleted = false,
  isEdited,
  createdAt,
  isInteractionDisabled = false,
  onEdit,
  onDelete,
  onReply,
  onForward,
  align = 'end',
  side = 'bottom',
  open,
  onOpenChange
}: MessageContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteScope, setDeleteScope] = useState<'me' | 'everyone'>('me')
  const { toast } = useToast()
  const isControlled = open !== undefined && onOpenChange
  const menuOpen = isControlled ? open : isOpen
  const setMenuOpen = isControlled ? onOpenChange! : setIsOpen

  const handleCopy = () => {
    if (isInteractionDisabled) return
    navigator.clipboard.writeText(content)
    toast({
      variant: 'success',
      title: 'Copied',
      description: 'Message copied to clipboard.',
    })
    setMenuOpen(false)
  }

  const handleEdit = () => {
    if (isInteractionDisabled) return
    onEdit(messageId, content, createdAt)
    setMenuOpen(false)
  }

  const handleDelete = (scope: 'me' | 'everyone') => {
    if (isInteractionDisabled) return
    setDeleteScope(scope)
    setDeleteDialogOpen(true)
    setMenuOpen(false)
  }

  const handleReply = () => {
    if (isInteractionDisabled) return
    onReply(messageId)
    setMenuOpen(false)
  }

  const handleForward = () => {
    if (isInteractionDisabled) return
    onForward(messageId)
    setMenuOpen(false)
  }

  // Check if message is too old to edit (5 minutes)
  const messageAge = new Date().getTime() - new Date(createdAt).getTime()
  const maxAge = 5 * 60 * 1000 // 5 minutes
  const canEdit = isOwn && !isDeleted && messageAge < maxAge
  const canDeleteForAll = !isDeleted && (isOwn || canDeleteForEveryone)

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 w-6 p-0 transition-opacity hover:bg-blue-500 dark:hover:bg-blue-500 ${
              menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <MoreVertical className="h-3 w-3" />
            <span className="sr-only">Message options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={align}
          side={side}
          sideOffset={8}
          className="w-48 rounded-xl border border-gray-200 bg-white p-1.5 text-gray-800 shadow-xl dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          <DropdownMenuItem
            onClick={handleReply}
            disabled={isInteractionDisabled}
            className="text-sm focus:bg-gray-100 focus:text-gray-900 dark:focus:bg-gray-700 dark:focus:text-gray-50"
          >
            <Reply className="mr-2 h-4 w-4" />
            Reply
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={handleCopy}
            disabled={isInteractionDisabled}
            className="text-sm focus:bg-gray-100 focus:text-gray-900 dark:focus:bg-gray-700 dark:focus:text-gray-50"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleForward}
            disabled={isInteractionDisabled}
            className="text-sm focus:bg-gray-100 focus:text-gray-900 dark:focus:bg-gray-700 dark:focus:text-gray-50"
          >
            <Forward className="mr-2 h-4 w-4" />
            Forward
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />

          {isOwn && canEdit && (
            <DropdownMenuItem
              onClick={handleEdit}
              disabled={isInteractionDisabled}
              className="text-sm focus:bg-gray-100 focus:text-gray-900 dark:focus:bg-gray-700 dark:focus:text-gray-50"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
              {isEdited && <span className="ml-auto text-xs text-gray-500">(edited)</span>}
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={() => handleDelete('me')}
            disabled={isInteractionDisabled}
            className="text-sm text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete for me
          </DropdownMenuItem>

          {canDeleteForAll && (
            <DropdownMenuItem
              onClick={() => handleDelete('everyone')}
              disabled={isInteractionDisabled}
              className="text-sm text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete for everyone
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {deleteScope === 'everyone' ? 'Delete for everyone?' : 'Delete for me?'}
            </DialogTitle>
            <DialogDescription>
              {deleteScope === 'everyone'
                ? 'This will remove the message for everyone in this chat.'
                : 'This will remove the message only for you.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={() => {
                onDelete(messageId, deleteScope)
                setDeleteDialogOpen(false)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
