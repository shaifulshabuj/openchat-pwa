'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Send,
  Smile,
  Paperclip,
  Phone,
  Video,
  MoreVertical,
  Image as ImageIcon,
  FileText,
  Download,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSocket } from '@/hooks/useSocket'
import { useToast } from '@/hooks/use-toast'
import { chatAPI, type Chat, type Message } from '@/lib/api'
import { FileUpload } from '@/components/FileUpload'
import { MessageReactions } from '@/components/MessageReactions'
import { MessageContextMenu } from '@/components/MessageContextMenu'
import { EditMessageDialog } from '@/components/EditMessageDialog'
import { MessageReadIndicator, type ReadStatus } from '@/components/MessageReadIndicator'
import { reactionsAPI, messageStatusAPI } from '@/lib/api'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface ChatPageProps {
  params: Promise<{ chatId: string }>
}

export default function ChatPage({ params }: ChatPageProps) {
  const [chatId, setChatId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [chat, setChat] = useState<Chat | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTyping, setIsTyping] = useState<Array<{ userId: string; username: string }>>([])
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null)
  const [isEditLoading, setIsEditLoading] = useState(false)
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null)
  const [messageReadStatus, setMessageReadStatus] = useState<Record<string, ReadStatus>>({})
  const [unreadMessages, setUnreadMessages] = useState<Set<string>>(new Set())
  const [participantStatuses, setParticipantStatuses] = useState<Record<string, string>>({})

  const { user } = useAuthStore()
  const { isConnected, on, off, joinChat, sendMessage, startTyping, stopTyping } = useSocket()
  const { toast } = useToast()
  const router = useRouter()

  // Extract chatId from async params
  useEffect(() => {
    params.then((resolvedParams) => {
      setChatId(resolvedParams.chatId)
    })
  }, [params])

  // Load chat details and messages
  useEffect(() => {
    if (!chatId) return

    const loadChatData = async () => {
      try {
        const [chatResponse, messagesResponse] = await Promise.all([
          chatAPI.getChatDetails(chatId),
          chatAPI.getChatMessages(chatId),
        ])

        if (chatResponse.success) {
          setChat(chatResponse.data)
          const statuses = Object.fromEntries(
            chatResponse.data.participants.map((participant) => [
              participant.user.id,
              participant.user.status,
            ])
          )
          setParticipantStatuses(statuses)
        }

        if (messagesResponse.success) {
          setMessages(messagesResponse.data)
        }
      } catch (error) {
        console.error('Error loading chat data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadChatData()
  }, [chatId])

  // Join chat room and listen for real-time events
  useEffect(() => {
    if (isConnected && chatId) {
      joinChat(chatId)

      // Listen for new messages
      on('new-message', ({ message }: { message: any }) => {
        if (message.chatId === chatId) {
          setMessages((prev) => [...prev, message])
        }
      })

      // Listen for typing indicators
      on('user-typing', ({ userId, username }: { userId: string; username: string }) => {
        if (userId !== user?.id) {
          setIsTyping((prev) => {
            if (prev.some((entry) => entry.userId === userId)) {
              return prev
            }
            return [...prev, { userId, username }]
          })
        }
      })

      on('user-stopped-typing', ({ userId }: { userId: string }) => {
        if (userId !== user?.id) {
          setIsTyping((prev) => prev.filter((entry) => entry.userId !== userId))
        }
      })

      on(
        'user-status-changed',
        ({ userId, status }: { userId: string; username: string; status: string; lastSeen: Date }) => {
          setParticipantStatuses((prev) => ({
            ...prev,
            [userId]: status,
          }))
        }
      )

      // Listen for message edits
      on('message-edited', ({ message }: { message: any }) => {
        if (message.chatId === chatId) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === message.id
                ? { ...msg, content: message.content, isEdited: true, updatedAt: message.updatedAt }
                : msg
            )
          )
        }
      })

      // Listen for message deletions
      on(
        'message-deleted',
        ({
          messageId,
          chatId: eventChatId,
        }: {
          messageId: string
          chatId: string
          deletedBy: string
        }) => {
          if (eventChatId === chatId) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId
                  ? { ...msg, content: '[Message deleted]', isDeleted: true }
                  : msg
              )
            )
          }
        }
      )

      // Listen for reaction updates
      on('reaction-added', ({ messageId, reaction }: { messageId: string; reaction: any }) => {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === messageId) {
              const reactions = (msg as any).reactions || []
              const existingReaction = reactions.find((r: any) => r.emoji === reaction.emoji)

              if (existingReaction) {
                existingReaction.count += 1
                existingReaction.users.push({
                  id: reaction.user.id,
                  displayName: reaction.user.displayName,
                })
              } else {
                reactions.push({
                  emoji: reaction.emoji,
                  count: 1,
                  users: [
                    {
                      id: reaction.user.id,
                      displayName: reaction.user.displayName,
                    },
                  ],
                  hasReacted: reaction.user.id === user?.id,
                })
              }

              return { ...msg, reactions }
            }
            return msg
          })
        )
      })

      on(
        'reaction-removed',
        ({ messageId, userId, emoji }: { messageId: string; userId: string; emoji: string }) => {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === messageId) {
                const reactions = ((msg as any).reactions || [])
                  .map((r: any) => {
                    if (r.emoji === emoji) {
                      return {
                        ...r,
                        count: r.count - 1,
                        users: r.users.filter((u: any) => u.id !== userId),
                        hasReacted: userId === user?.id ? false : r.hasReacted,
                      }
                    }
                    return r
                  })
                  .filter((r: any) => r.count > 0)

                return { ...msg, reactions }
              }
              return msg
            })
          )
        }
      )

      return () => {
        off('new-message')
        off('user-typing')
        off('user-stopped-typing')
        off('user-status-changed')
        off('message-edited')
        off('message-deleted')
        off('reaction-added')
        off('reaction-removed')
      }
    }
  }, [isConnected, chatId, joinChat, on, off, user?.id])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return

    try {
      // Send via API for persistence
      await chatAPI.sendMessage(chatId, { content: newMessage.trim() })

      // Also send via Socket.IO for real-time
      if (isConnected) {
        sendMessage(chatId, newMessage.trim())
      }

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage =
        (error as any).response?.data?.error || 'Failed to send message. Please try again.'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      })
    }
  }

  const handleTyping = () => {
    if (user && isConnected) {
      startTyping(chatId, user.id, user.username)
    }
  }

  const handleStopTyping = () => {
    if (user && isConnected) {
      stopTyping(chatId, user.id)
    }
  }

  const getChatDisplayName = () => {
    if (!chat) return 'Loading...'

    if (chat.type === 'GROUP' || chat.type === 'CHANNEL') {
      return chat.name || 'Group Chat'
    }

    // For private chats, show the other user's name
    const otherUser = chat.participants.find((p) => p.user.id !== user?.id)
    return otherUser?.user.displayName || 'Private Chat'
  }

  const getChatAvatar = () => {
    if (chat?.avatar) return chat.avatar

    if (chat?.type === 'PRIVATE') {
      const otherUser = chat.participants.find((p) => p.user.id !== user?.id)
      return otherUser?.user.avatar
    }

    return null
  }

  const getChatStatus = () => {
    if (!chat || chat.type !== 'PRIVATE') {
      return isConnected ? 'Online' : 'Connecting...'
    }

    const otherUser = chat.participants.find((p) => p.user.id !== user?.id)
    if (!otherUser) {
      return isConnected ? 'Online' : 'Connecting...'
    }

    return participantStatuses[otherUser.user.id] || 'OFFLINE'
  }

  const handleFileUploaded = (fileInfo: any) => {
    // Send file message
    const fileMessage = `📎 ${fileInfo.filename}`
    if (isConnected) {
      sendMessage(chatId, fileMessage, 'FILE')
    }
  }

  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      const result = await reactionsAPI.addReaction(messageId, emoji)

      // Update local state optimistically
      setMessages((prev) =>
        prev.map((msg: any) => {
          if (msg.id === messageId) {
            const reactions = msg.reactions || []
            const existingReaction = reactions.find((r: any) => r.emoji === emoji)

            if (result.action === 'added') {
              if (existingReaction) {
                existingReaction.count += 1
                existingReaction.hasReacted = true
              } else {
                reactions.push({
                  emoji,
                  count: 1,
                  users: [{ id: user!.id, displayName: user!.displayName }],
                  hasReacted: true,
                })
              }
            } else if (result.action === 'removed') {
              if (existingReaction) {
                existingReaction.count -= 1
                existingReaction.hasReacted = false
                if (existingReaction.count <= 0) {
                  const index = reactions.indexOf(existingReaction)
                  reactions.splice(index, 1)
                }
              }
            }

            return { ...msg, reactions }
          }
          return msg
        })
      )
    } catch (error) {
      console.error('Error adding reaction:', error)
      const errorMessage =
        (error as any).response?.data?.error || 'Failed to add reaction. Please try again.'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      })
    }
  }

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    try {
      await reactionsAPI.removeReaction(messageId, emoji)

      // Update local state optimistically
      setMessages((prev) =>
        prev.map((msg: any) => {
          if (msg.id === messageId) {
            const reactions =
              msg.reactions
                ?.map((r: any) => {
                  if (r.emoji === emoji) {
                    return {
                      ...r,
                      count: r.count - 1,
                      hasReacted: false,
                    }
                  }
                  return r
                })
                .filter((r: any) => r.count > 0) || []

            return { ...msg, reactions }
          }
          return msg
        })
      )
    } catch (error) {
      console.error('Error removing reaction:', error)
      const errorMessage =
        (error as any).response?.data?.error || 'Failed to remove reaction. Please try again.'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      })
    }
  }

  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessage({ id: messageId, content })
  }

  const handleSaveEdit = async (messageId: string, content: string) => {
    if (!chatId) return

    setIsEditLoading(true)
    try {
      const result = await chatAPI.editMessage(chatId, messageId, { content })

      // Update local state
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content, isEdited: true, updatedAt: new Date().toISOString() }
            : msg
        )
      )

      setEditingMessage(null)
      toast({
        variant: 'success',
        title: 'Message edited',
        description: 'Your message has been updated successfully.',
      })
    } catch (error) {
      console.error('Error editing message:', error)
      const errorMessage =
        (error as any).response?.data?.error || 'Failed to edit message. Please try again.'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      })
    } finally {
      setIsEditLoading(false)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!chatId) return

    try {
      await chatAPI.deleteMessage(chatId, messageId)

      // Update local state
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, content: '[Message deleted]', isDeleted: true } : msg
        )
      )

      toast({
        variant: 'success',
        title: 'Message deleted',
        description: 'The message has been deleted successfully.',
      })
    } catch (error) {
      console.error('Error deleting message:', error)
      const errorMessage =
        (error as any).response?.data?.error || 'Failed to delete message. Please try again.'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      })
    }
  }

  const handleReplyToMessage = (messageId: string) => {
    const message = messages.find((msg) => msg.id === messageId)
    if (message) {
      setReplyToMessage(message)
    }
  }

  const renderFileMessage = (message: any) => {
    const isFile = message.type === 'FILE' || message.content.startsWith('📎')

    if (!isFile) return null

    const filename = message.content.replace('📎 ', '')
    const fileUrl = message.metadata ? JSON.parse(message.metadata).url : null

    return (
      <div className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
        <FileText className="w-6 h-6 text-gray-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{filename}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Shared file</p>
        </div>
        {fileUrl && (
          <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <Download className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      <div className="flex flex-col w-full">
        {/* Chat Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  {getChatAvatar() ? (
                    <img src={getChatAvatar()!} alt="Avatar" className="w-10 h-10 rounded-full" />
                  ) : (
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      {getChatDisplayName().charAt(0)}
                    </span>
                  )}
                </div>

                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {getChatDisplayName()}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {getChatStatus()}
                    {isTyping.length > 0 && (
                      <span className="text-green-600">
                        {' • '}
                        {isTyping.map((entry) => entry.username).join(', ')} typing...
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <Phone className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <Video className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                Start the conversation by sending a message!
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.senderId === user?.id
              const showAvatar = !isOwn

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-2 group`}
                >
                  {showAvatar && (
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        {message.sender.displayName.charAt(0)}
                      </span>
                    </div>
                  )}

                  <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-1' : ''} relative`}>
                    {!isOwn && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 px-3">
                        {message.sender.displayName}
                      </p>
                    )}

                    <div className="relative">
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isOwn
                            ? 'bg-green-500 text-white rounded-br-sm'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm'
                        }`}
                      >
                        {message.type === 'FILE' || message.content.startsWith('📎') ? (
                          renderFileMessage(message)
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content}
                            {message.isEdited && (
                              <span className="text-xs opacity-70 ml-2">(edited)</span>
                            )}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-1">
                          <p
                            className={`text-xs ${
                              isOwn ? 'text-green-100' : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {dayjs(message.createdAt).fromNow()}
                          </p>
                        </div>
                      </div>

                      {/* Message Context Menu */}
                      <div className={`absolute top-2 ${isOwn ? 'left-2' : 'right-2'}`}>
                        <MessageContextMenu
                          messageId={message.id}
                          chatId={chatId}
                          content={message.content}
                          isOwn={isOwn}
                          isEdited={message.isEdited}
                          createdAt={message.createdAt}
                          onEdit={handleEditMessage}
                          onDelete={handleDeleteMessage}
                          onReply={handleReplyToMessage}
                        />
                      </div>
                    </div>

                    {/* Message Reactions */}
                    <MessageReactions
                      messageId={message.id}
                      reactions={(message as any).reactions || []}
                      onAddReaction={handleAddReaction}
                      onRemoveReaction={handleRemoveReaction}
                    />
                  </div>
                </div>
              )
            })
          )}
        </main>

        {/* Message Input */}
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFileUpload(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>

            <div className="flex-1 relative">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                onFocus={handleTyping}
                onBlur={handleStopTyping}
                placeholder="Type a message..."
                className="pr-12 rounded-full"
              />

              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <Smile className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !isConnected}
              className="rounded-full w-10 h-10 p-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>

          {/* File Upload Modal */}
          {showFileUpload && (
            <FileUpload
              onFileUploaded={handleFileUploaded}
              onClose={() => setShowFileUpload(false)}
            />
          )}
        </footer>

        {/* Edit Message Dialog */}
        <EditMessageDialog
          isOpen={!!editingMessage}
          messageId={editingMessage?.id || ''}
          initialContent={editingMessage?.content || ''}
          isLoading={isEditLoading}
          onClose={() => setEditingMessage(null)}
          onSave={handleSaveEdit}
        />
      </div>
    </div>
  )
}
