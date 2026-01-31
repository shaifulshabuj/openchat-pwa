'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Pin, Archive, MoreHorizontal } from 'lucide-react'
import { chatAPI, type Chat } from '@/lib/api'
import { chatRoute } from '@/lib/routes'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/hooks/use-toast'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export function ChatList() {
  const [chats, setChats] = useState<Chat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [includeArchived, setIncludeArchived] = useState(false)
  const { user } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const loadChats = async () => {
      try {
        const response = await chatAPI.getChats(includeArchived)
        if (response.success) {
          setChats(response.data)
        }
      } catch (error) {
        console.error('Error loading chats:', error)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load chats. Please refresh the page.',
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      loadChats()
    }
  }, [user, includeArchived])

  const handlePinChat = async (chatId: string, isPinned: boolean, event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await chatAPI.pinChat(chatId, !isPinned)
      setChats(prev => 
        prev.map(chat => 
          chat.id === chatId ? { ...chat, isPinned: !isPinned } : chat
        )
      )
      toast({
        title: !isPinned ? 'Chat pinned' : 'Chat unpinned',
        description: !isPinned ? 'Chat moved to top' : 'Chat unpinned',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update chat',
      })
    }
  }

  const handleArchiveChat = async (chatId: string, isArchived: boolean, event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await chatAPI.archiveChat(chatId, !isArchived)
      setChats(prev => 
        prev.filter(chat => chat.id !== chatId)
      )
      toast({
        title: !isArchived ? 'Chat archived' : 'Chat unarchived',
        description: !isArchived ? 'Chat moved to archive' : 'Chat restored from archive',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update chat',
      })
    }
  }

  const getChatDisplayName = (chat: Chat) => {
    if (chat.type === 'GROUP' || chat.type === 'CHANNEL') {
      return chat.name || 'Group Chat'
    }
    
    // For private chats, show the other user's name
    const otherUser = chat.participants.find(p => p.user.id !== user?.id)
    return otherUser?.user.displayName || 'Private Chat'
  }

  const getChatAvatar = (chat: Chat) => {
    if (chat.avatar) return chat.avatar
    
    if (chat.type === 'PRIVATE') {
      const otherUser = chat.participants.find(p => p.user.id !== user?.id)
      return otherUser?.user.avatar
    }
    
    return null
  }

  const getChatPresence = (chat: Chat) => {
    if (chat.type !== 'PRIVATE') return null
    const otherUser = chat.participants.find((p) => p.user.id !== user?.id)
    return otherUser?.user.status || null
  }

  const getLastMessagePreview = (chat: Chat) => {
    if (!chat.lastMessage) {
      return 'No messages yet'
    }

    const content = chat.lastMessage.content
    if (content.length > 50) {
      return content.substring(0, 50) + '...'
    }
    return content
  }

  const getUnreadCount = (chat: Chat) => {
    if (!chat.lastMessage) {
      return 0
    }

    const lastReadAt = user?.id
      ? localStorage.getItem(`chat_read_${chat.id}_${user.id}`)
      : null
    if (lastReadAt) {
      const lastReadTime = new Date(lastReadAt).getTime()
      const lastMessageTime = new Date(chat.lastMessage.createdAt).getTime()
      if (lastReadTime >= lastMessageTime) {
        return 0
      }
    }

    return chat.unreadCount
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chats...</p>
        </div>
      </div>
    )
  }

  if (chats.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 h-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4 mx-auto">
            <MessageSquare className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No conversations yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm max-w-sm mx-auto">
            Start a new conversation by tapping the + button below
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {chats.map((chat) => {
        const displayName = getChatDisplayName(chat)
        const avatar = getChatAvatar(chat)
        const lastMessage = getLastMessagePreview(chat)
        const unreadCount = getUnreadCount(chat)
        const presence = getChatPresence(chat)
        const isOnline = presence === 'ONLINE'
        const timeAgo = chat.lastMessage 
          ? dayjs(chat.lastMessage.createdAt).fromNow()
          : dayjs(chat.createdAt).fromNow()

        return (
          <button
            key={chat.id}
            onClick={() => router.push(chatRoute(chat.id) as any)}
            className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {presence && (
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-900 ${
                      isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                    aria-label={isOnline ? 'Online' : 'Offline'}
                  />
                )}
                
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {displayName}
                    </h3>
                    {(chat as any).isPinned && (
                      <Pin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {timeAgo}
                    </span>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem 
                          onClick={(e) => handlePinChat(chat.id, (chat as any).isPinned, e)}
                        >
                          <Pin className="w-4 h-4 mr-2" />
                          {(chat as any).isPinned ? 'Unpin' : 'Pin'} Chat
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => handleArchiveChat(chat.id, (chat as any).isArchived, e)}
                        >
                          <Archive className="w-4 h-4 mr-2" />
                          {(chat as any).isArchived ? 'Unarchive' : 'Archive'} Chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {chat.lastMessage?.senderId === user?.id && 'You: '}
                  {lastMessage}
                </p>
                
                {chat.type === 'GROUP' && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {chat.participants.length} participants
                  </p>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
