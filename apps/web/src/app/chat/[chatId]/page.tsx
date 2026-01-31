'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Send,
  Smile,
  Paperclip,
  Phone,
  Video,
  MoreVertical,
  Settings,
  Image as ImageIcon,
  FileText,
  Download,
  Mic,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MentionInput } from '@/components/MentionInput'
import { MentionHighlight } from '@/components/MentionHighlight'
import { useSocket } from '@/hooks/useSocket'
import { useToast } from '@/hooks/use-toast'
import { chatAPI, type Chat, type Message, type MessageDeleteScope } from '@/lib/api'
import { FileUpload } from '@/components/FileUpload'
import { MessageReactions } from '@/components/MessageReactions'
import { MessageContextMenu } from '@/components/MessageContextMenu'
import { EditMessageDialog } from '@/components/EditMessageDialog'
import { MessageReadIndicator, type ReadStatus } from '@/components/MessageReadIndicator'
import MessageSearch from '@/components/MessageSearch'
import VideoPlayer from '@/components/VideoPlayer'
import AudioPlayer from '@/components/AudioPlayer'
import AudioRecorder from '@/components/AudioRecorder'
import GroupSettings from '@/components/GroupSettings'
import { reactionsAPI, messageStatusAPI } from '@/lib/api'
import { contactsAPI } from '@/services/contacts'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useContactsStore } from '@/store/contacts'

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
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)
  const [editingMessage, setEditingMessage] = useState<{
    id: string
    content: string
    createdAt: string
  } | null>(null)
  const [isEditLoading, setIsEditLoading] = useState(false)
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null)
  const [messageReadStatus, setMessageReadStatus] = useState<Record<string, ReadStatus>>({})
  const [unreadMessages, setUnreadMessages] = useState<Set<string>>(new Set())
  const [participantStatuses, setParticipantStatuses] = useState<Record<string, string>>({})
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const [openMenuMessageId, setOpenMenuMessageId] = useState<string | null>(null)
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)
  const highlightTimerRef = useRef<number | null>(null)
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null)
  const [forwardChats, setForwardChats] = useState<Chat[]>([])
  const [forwardQuery, setForwardQuery] = useState('')
  const [forwardLoading, setForwardLoading] = useState(false)
  const [forwardNote, setForwardNote] = useState('')
  const [forwardSelected, setForwardSelected] = useState<Set<string>>(new Set())
  const [showGroupSettings, setShowGroupSettings] = useState(false)

  const { user } = useAuthStore()
  const { refreshAll: refreshContacts } = useContactsStore()
  const { isConnected, isOnline, on, off, joinChat, sendMessage, startTyping, stopTyping } = useSocket()
  const { toast } = useToast()
  const router = useRouter()

  const resolveUrl = (url?: string | null) => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || ''
    if (!url) return null
    if (url.startsWith('http')) return url
    return apiBase ? `${apiBase}${url}` : url
  }

  const isGroupChat = chat?.type === 'GROUP'

  const isGroupAdmin = useMemo(() => {
    if (!chat || !user || chat.type !== 'GROUP') return false
    return chat.admins?.some((admin) => admin.user.id === user.id) || false
  }, [chat, user])

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior })
    }
  }

  type ContactMetadata =
    | {
        kind: 'contact-request'
        status: 'pending' | 'accepted' | 'declined'
        fromUserId: string
        toUserId: string
      }
    | {
        kind: 'contact-block'
        status: 'blocked' | 'unblocked'
        blockerId: string
        targetUserId: string
      }

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
          const metadata = normalizeMetadata(message.metadata)
          if (metadata?.forwardedFrom) {
            setHighlightedMessageId(message.id)
            if (highlightTimerRef.current) {
              window.clearTimeout(highlightTimerRef.current)
            }
            highlightTimerRef.current = window.setTimeout(() => {
              setHighlightedMessageId(null)
            }, 900)
          }
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

      on(
        'message-deleted-for-me',
        ({
          messageId,
          chatId: eventChatId,
        }: {
          messageId: string
          chatId: string
          deletedBy: string
        }) => {
          if (eventChatId === chatId) {
            setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
          }
        }
      )

      on(
        'messages-read',
        ({ messageIds, chatId: eventChatId }: { messageIds: string[]; chatId: string }) => {
          if (eventChatId === chatId) {
            setUnreadMessages((prev) => {
              const next = new Set(prev)
              messageIds.forEach((id) => next.delete(id))
              return next
            })
          }
        }
      )

      // Listen for reaction updates
      on('reaction-added', ({ messageId, reaction }: { messageId: string; reaction: any }) => {
        if (reaction?.user?.id === user?.id) {
          return
        }
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === messageId) {
              const reactions = ((msg as any).reactions || []).map((r: any) => ({
                ...r,
                users: r.users ? [...r.users] : [],
              }))
              const existingIndex = reactions.findIndex((r: any) => r.emoji === reaction.emoji)

              if (existingIndex >= 0) {
                const existing = reactions[existingIndex]
                if (existing.users.some((u: any) => u.id === reaction.user.id)) {
                  return msg
                }
                const users = [
                  ...existing.users,
                  {
                    id: reaction.user.id,
                    displayName: reaction.user.displayName,
                  },
                ]
                reactions[existingIndex] = {
                  ...existing,
                  users,
                  count: users.length,
                }
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
          if (userId === user?.id) {
            return
          }
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === messageId) {
                const reactions = ((msg as any).reactions || []).map((r: any) => ({
                  ...r,
                  users: r.users ? [...r.users] : [],
                }))
                const existingIndex = reactions.findIndex((r: any) => r.emoji === emoji)

                if (existingIndex >= 0) {
                  const existing = reactions[existingIndex]
                  const users = existing.users.filter((u: any) => u.id !== userId)
                  if (users.length === 0) {
                    reactions.splice(existingIndex, 1)
                  } else {
                    reactions[existingIndex] = {
                      ...existing,
                      users,
                      count: users.length,
                      hasReacted: userId === user?.id ? false : existing.hasReacted,
                    }
                  }
                }

                return { ...msg, reactions }
              }
              return msg
            })
          )
        }
      )

      // Listen for mention notifications
      on('mention-notification', (data: any) => {
        const { messageId, chatId: mentionChatId, mentionedBy, content, chatName } = data
        // Only show notification if not on the current chat page
        if (mentionChatId !== chatId) {
          const { showToast } = require('@/hooks/use-toast')
          showToast({
            title: `${mentionedBy.displayName} mentioned you`,
            description: `In ${chatName}: ${content.length > 50 ? content.substring(0, 50) + '...' : content}`,
            variant: 'default',
          })
        }
      })

      return () => {
        off('new-message')
        off('user-typing')
        off('user-stopped-typing')
        off('user-status-changed')
        off('message-edited')
        off('message-deleted')
        off('message-deleted-for-me')
        off('reaction-added')
        off('reaction-removed')
        off('messages-read')
        off('mention-notification')
      }
    }
  }, [isConnected, chatId, joinChat, on, off, user?.id])

  useEffect(() => {
    if (!messages.length || !user?.id) return

    const unread = messages.filter((message) => message.senderId !== user.id).map((message) => message.id)
    if (unread.length === 0) return

    const markRead = async () => {
      try {
        await messageStatusAPI.markAsRead(unread)
        const latestMessage = messages.reduce((latest, message) => {
          if (!latest) return message
          return new Date(message.createdAt).getTime() > new Date(latest.createdAt).getTime()
            ? message
            : latest
        }, null as Message | null)
        if (latestMessage && user?.id) {
          localStorage.setItem(`chat_read_${chatId}_${user.id}`, latestMessage.createdAt)
        }
        setUnreadMessages(new Set())
      } catch (error) {
        console.error('Failed to mark messages read:', error)
      }
    }

    markRead()
  }, [messages, user?.id])

  useEffect(() => {
    if (!messagesEndRef.current) return
    const lastMessageId = messages[messages.length - 1]?.id || null
    if (lastMessageId && lastMessageId !== lastMessageIdRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' })
      lastMessageIdRef.current = lastMessageId
    }
  }, [messages])

  const startLongPress = (messageId: string) => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
    }
    longPressTimerRef.current = window.setTimeout(() => {
      setOpenMenuMessageId(messageId)
    }, 450)
  }

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return
    if (!canSendMessages) {
      toast({
        variant: 'destructive',
        title: 'Messaging disabled',
        description: sendDisabledReason,
      })
      return
    }

    try {
      // Send via API for persistence
      await chatAPI.sendMessage(chatId, {
        content: newMessage.trim(),
        replyToId: replyToMessage?.id,
      })

      setNewMessage('')
      setReplyToMessage(null)
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
      return isOnline ? 'Online' : 'Connecting...'
    }

    const otherUser = chat.participants.find((p) => p.user.id !== user?.id)
    if (!otherUser) {
      return isOnline ? 'Online' : 'Connecting...'
    }

    return participantStatuses[otherUser.user.id] || 'OFFLINE'
  }

  const handleFileUploaded = async (fileInfo: any) => {
    if (!canSendMessages) {
      toast({
        variant: 'destructive',
        title: 'Messaging disabled',
        description: sendDisabledReason,
      })
      return
    }

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || ''
      const resolveUrl = (url?: string | null) => {
        if (!url) return null
        if (url.startsWith('http')) return url
        if (!apiBase) return url
        return `${apiBase}${url}`
      }

      const fileMessage = `📎 ${fileInfo.filename}`
      await chatAPI.sendMessage(chatId, {
        content: fileMessage,
        type: 'FILE',
        metadata: {
          url: resolveUrl(fileInfo.url),
          thumbnailUrl: resolveUrl(fileInfo.thumbnailUrl),
          mimetype: fileInfo.mimetype,
          size: fileInfo.size,
          filename: fileInfo.filename,
        }
      })
    } catch (error) {
      console.error('Error sending file message:', error)
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Unable to send file message. Please try again.',
      })
    }
  }

  const handleAudioRecording = async (audioBlob: Blob, duration: number) => {
    if (!canSendMessages) {
      toast({
        variant: 'destructive',
        title: 'Messaging disabled',
        description: sendDisabledReason,
      })
      return
    }

    try {
      // Create FormData to upload the audio blob
      const formData = new FormData()
      formData.append('file', audioBlob, `voice_message_${Date.now()}.webm`)

      const response = await fetch('/api/upload/file', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Audio upload failed')
      }

      const fileInfo = await response.json()

      // Send audio message
      await chatAPI.sendMessage(chatId, {
        content: `🎵 Voice message (${Math.floor(duration)}s)`,
        type: 'FILE',
        replyToId: replyToMessage?.id,
        metadata: {
          ...fileInfo.data,
          duration,
          url: resolveUrl(fileInfo.data.url),
          mimetype: 'audio/webm',
        }
      })

      setShowAudioRecorder(false)
      setReplyToMessage(null)
      scrollToBottom()

      toast({
        title: 'Voice message sent',
        description: 'Your audio message has been sent.',
      })
    } catch (error) {
      console.error('Error sending audio message:', error)
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Unable to send voice message. Please try again.',
      })
    }
  }

  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      const result = await reactionsAPI.addReaction(messageId, emoji)

      // Update local state optimistically
      setMessages((prev) =>
        prev.map((msg: any) => {
          if (msg.id === messageId) {
            const reactions = (msg.reactions || []).map((r: any) => ({
              ...r,
              users: r.users ? [...r.users] : [],
            }))
            const existingIndex = reactions.findIndex((r: any) => r.emoji === emoji)

            if (result.action === 'added') {
              if (existingIndex >= 0) {
                const existing = reactions[existingIndex]
                if (existing.users.some((u: any) => u.id === user!.id)) {
                  return msg
                }
                const users = [
                  ...existing.users,
                  { id: user!.id, displayName: user!.displayName },
                ]
                reactions[existingIndex] = {
                  ...existing,
                  users,
                  count: users.length,
                  hasReacted: true,
                }
              } else {
                reactions.push({
                  emoji,
                  count: 1,
                  users: [{ id: user!.id, displayName: user!.displayName }],
                  hasReacted: true,
                })
              }
            } else if (result.action === 'removed') {
              if (existingIndex >= 0) {
                const existing = reactions[existingIndex]
                const users = existing.users.filter((u: any) => u.id !== user!.id)
                if (users.length === 0) {
                  reactions.splice(existingIndex, 1)
                } else {
                  reactions[existingIndex] = {
                    ...existing,
                    users,
                    count: users.length,
                    hasReacted: false,
                  }
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
            const reactions = (msg.reactions || []).map((r: any) => ({
              ...r,
              users: r.users ? [...r.users] : [],
            }))
            const existingIndex = reactions.findIndex((r: any) => r.emoji === emoji)

            if (existingIndex >= 0) {
              const existing = reactions[existingIndex]
              const users = existing.users.filter((u: any) => u.id !== user!.id)
              if (users.length === 0) {
                reactions.splice(existingIndex, 1)
              } else {
                reactions[existingIndex] = {
                  ...existing,
                  users,
                  count: users.length,
                  hasReacted: false,
                }
              }
            }

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

  const handleEditMessage = (messageId: string, content: string, createdAt: string) => {
    setEditingMessage({ id: messageId, content, createdAt })
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

  const handleDeleteMessage = async (messageId: string, scope: MessageDeleteScope) => {
    if (!chatId) return

    try {
      await chatAPI.deleteMessage(chatId, messageId, scope)

      // Update local state
      if (scope === 'me') {
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, content: '[Message deleted]', isDeleted: true } : msg
          )
        )
      }

      toast({
        variant: 'success',
        title: scope === 'me' ? 'Message removed' : 'Message deleted',
        description:
          scope === 'me'
            ? 'The message has been removed for you.'
            : 'The message has been deleted for everyone.',
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

  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedMessageId(messageId)
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current)
      }
      highlightTimerRef.current = window.setTimeout(() => {
        setHighlightedMessageId(null)
      }, 900)
    }
  }

  const getForwardChatDisplayName = (chatItem: Chat) => {
    if (chatItem.type === 'GROUP' || chatItem.type === 'CHANNEL') {
      return chatItem.name || 'Group Chat'
    }
    const otherUser = chatItem.participants.find((p) => p.user.id !== user?.id)
    return otherUser?.user.displayName || 'Private Chat'
  }

  const getForwardChatAvatar = (chatItem: Chat) => {
    if (chatItem.avatar) return chatItem.avatar
    if (chatItem.type === 'PRIVATE') {
      const otherUser = chatItem.participants.find((p) => p.user.id !== user?.id)
      return otherUser?.user.avatar
    }
    return null
  }

  const normalizeMetadata = (metadata: Message['metadata']) => {
    if (!metadata) return undefined
    if (typeof metadata === 'string') {
      try {
        return JSON.parse(metadata)
      } catch {
        return undefined
      }
    }
    if (typeof metadata === 'object') {
      return metadata
    }
    return undefined
  }

  const parseContactMetadata = (metadata: Message['metadata']) => {
    const parsed = normalizeMetadata(metadata)
    if (!parsed || typeof parsed !== 'object' || !('kind' in parsed)) return null
    return parsed as ContactMetadata
  }

  const contactState = useMemo(() => {
    if (!chat || chat.type !== 'PRIVATE') {
      return {
        status: 'accepted' as const,
        isBlocked: false,
        blockedByMe: false,
        pendingIncoming: false,
        pendingOutgoing: false,
        requestMessageId: null as string | null
      }
    }

    let requestMeta: ContactMetadata | null = null
    let blockMeta: ContactMetadata | null = null
    let requestMessageId: string | null = null

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]
      if (message.type !== 'CONTACT') continue
      const meta = parseContactMetadata(message.metadata)
      if (!requestMeta && meta?.kind === 'contact-request') {
        requestMeta = meta
        requestMessageId = message.id
      }
      if (!blockMeta && meta?.kind === 'contact-block') {
        blockMeta = meta
      }
      if (requestMeta && blockMeta) break
    }

    const status =
      requestMeta?.kind === 'contact-request' ? requestMeta.status : 'accepted'
    const isBlocked = blockMeta?.kind === 'contact-block' && blockMeta.status === 'blocked'
    const blockedByMe = isBlocked && blockMeta?.kind === 'contact-block' && blockMeta.blockerId === user?.id
    const pendingIncoming =
      requestMeta?.kind === 'contact-request' &&
      requestMeta.status === 'pending' &&
      requestMeta.toUserId === user?.id
    const pendingOutgoing =
      requestMeta?.kind === 'contact-request' &&
      requestMeta.status === 'pending' &&
      requestMeta.fromUserId === user?.id

    return {
      status,
      isBlocked,
      blockedByMe,
      pendingIncoming,
      pendingOutgoing,
      requestMessageId
    }
  }, [chat, messages, user?.id])

  const canSendMessages =
    chat?.type !== 'PRIVATE' ||
    (!contactState.isBlocked &&
      (contactState.status === 'accepted' || contactState.pendingOutgoing))

  const sendDisabledReason = contactState.isBlocked
    ? contactState.blockedByMe
      ? 'You blocked this contact. Unblock to send messages.'
      : 'You cannot send messages to this contact.'
    : contactState.pendingIncoming
      ? 'Accept the contact request to start chatting.'
      : 'Contact request not accepted.'

  const handleContactRespond = async (requestId: string, status: 'accepted' | 'declined') => {
    try {
      const result = await contactsAPI.respondToRequest(requestId, status)
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== requestId) return msg
          const meta = parseContactMetadata(msg.metadata)
          if (!meta || meta.kind !== 'contact-request') return msg
          return {
            ...msg,
            metadata: { ...meta, status },
            content:
              status === 'accepted' ? 'Contact request accepted' : 'Contact request declined',
          }
        })
      )
      toast({
        title: status === 'accepted' ? 'Contact accepted' : 'Contact declined',
        description: result?.data?.status
          ? `Request ${status}.`
          : `Request ${status}.`,
      })
      await refreshContacts()
    } catch (error) {
      const errorMessage =
        (error as any).response?.data?.error || 'Unable to update contact request.'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      })
    }
  }

  useEffect(() => {
    if (!forwardMessage) return
    const loadChats = async () => {
      setForwardLoading(true)
      try {
        const response = await chatAPI.getChats()
        if (response.success) {
          setForwardChats(response.data)
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load chats for forwarding.',
        })
      } finally {
        setForwardLoading(false)
      }
    }
    loadChats()
  }, [forwardMessage, toast])

  const handleForwardMessage = (messageId: string) => {
    const message = messages.find((msg) => msg.id === messageId)
    if (message) {
      setForwardMessage(message)
      setForwardQuery('')
      setForwardNote('')
      setForwardSelected(new Set())
    }
  }

  const toggleForwardSelection = (chatIdValue: string) => {
    setForwardSelected((prev) => {
      const next = new Set(prev)
      if (next.has(chatIdValue)) {
        next.delete(chatIdValue)
      } else {
        next.add(chatIdValue)
      }
      return next
    })
  }

  const handleForwardToSelected = async () => {
    if (!forwardMessage || forwardSelected.size === 0) return
    try {
      const baseMetadata = normalizeMetadata(forwardMessage.metadata) || {}
      const forwardMeta = {
        ...baseMetadata,
        forwardedFrom: {
          chatId,
          messageId: forwardMessage.id,
          senderId: forwardMessage.senderId,
        },
      }
      const targets = Array.from(forwardSelected)
      await Promise.all(
        targets.map(async (targetChatId) => {
          if (forwardNote.trim()) {
            await chatAPI.sendMessage(targetChatId, {
              content: forwardNote.trim(),
            })
          }
          await chatAPI.sendMessage(targetChatId, {
            content: forwardMessage.content,
            type: forwardMessage.type || 'TEXT',
            metadata: forwardMeta,
          })
        })
      )
      toast({
        variant: 'success',
        title: 'Message forwarded',
        description: `Forwarded to ${targets.length} chat${targets.length > 1 ? 's' : ''}.`,
      })
      setForwardMessage(null)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Forward failed',
        description: 'Unable to forward the message. Please try again.',
      })
    }
  }

  const renderFileMessage = (message: any) => {
    const isFile = message.type === 'FILE' || message.content.startsWith('📎')

    if (!isFile) return null

    const filename = message.content.replace('📎 ', '')
    const metadata = normalizeMetadata(message.metadata) as any
    const fileUrl = metadata?.url || null

    return (
      <div className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
        <FileText className="w-6 h-6 text-gray-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{filename}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Shared file</p>
        </div>
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            aria-label="Download file"
          >
            <Download className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </a>
        )}
      </div>
    )
  }

  const renderVideoMessage = (message: any) => {
    const metadata = normalizeMetadata(message.metadata) as any
    const fileUrl = metadata?.url || null
    
    if (!fileUrl) return null

    // Check if it's a video by checking the content for video indicators or metadata
    const isVideo = metadata?.mimetype?.startsWith('video/') || 
      message.content.includes('🎥') ||
      /\.(mp4|webm|mov)$/i.test(fileUrl)

    if (!isVideo) return null

    return (
      <div className="max-w-sm">
        <VideoPlayer 
          src={fileUrl}
          className="rounded-lg"
          width="100%"
          height="auto"
        />
        {metadata?.originalName && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            📹 {metadata.originalName}
          </p>
        )}
      </div>
    )
  }

  const renderAudioMessage = (message: any) => {
    const metadata = normalizeMetadata(message.metadata) as any
    const fileUrl = metadata?.url || null
    
    if (!fileUrl) return null

    // Check if it's an audio file
    const isAudio = metadata?.mimetype?.startsWith('audio/') || 
      message.content.includes('🎵') ||
      /\.(mp3|wav|webm|ogg|m4a)$/i.test(fileUrl)

    if (!isAudio) return null

    return (
      <AudioPlayer 
        src={fileUrl}
        title={metadata?.originalName}
        duration={metadata?.duration}
        className="max-w-sm"
      />
    )
  }

  const renderImageMessage = (message: any) => {
    const metadata = normalizeMetadata(message.metadata) as any
    const fileUrl = metadata?.url || null
    
    if (!fileUrl) return null

    // Check if it's an image
    const isImage = metadata?.mimetype?.startsWith('image/') || 
      message.content.includes('🖼️') ||
      /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(fileUrl)

    if (!isImage) return null

    return (
      <div className="max-w-sm">
        <img 
          src={fileUrl}
          alt={metadata?.originalName || 'Shared image'}
          className="rounded-lg max-w-full h-auto cursor-pointer"
          onClick={() => window.open(fileUrl, '_blank')}
        />
        {metadata?.originalName && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            🖼️ {metadata.originalName}
          </p>
        )}
      </div>
    )
  }

  const renderContactMessage = (
    message: Message,
    metadata: ContactMetadata,
    isOwn: boolean
  ) => {
    if (metadata.kind === 'contact-block') {
      return (
        <p className={`text-sm ${isOwn ? 'text-white/90' : 'text-gray-700 dark:text-gray-200'}`}>
          {metadata.status === 'blocked' ? 'Contact blocked' : 'Contact unblocked'}
        </p>
      )
    }

    if (metadata.kind !== 'contact-request') return null

    const isIncoming = metadata.toUserId === user?.id
    const isPending = metadata.status === 'pending'

    return (
      <div className="space-y-2">
        <p className={`text-sm ${isOwn ? 'text-white/90' : 'text-gray-800 dark:text-gray-200'}`}>
          {isPending ? 'Contact request' : 'Contact request update'}
        </p>
        {isPending ? (
          isIncoming ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={isOwn ? 'secondary' : 'outline'}
                onClick={() => handleContactRespond(message.id, 'declined')}
              >
                Decline
              </Button>
              <Button size="sm" onClick={() => handleContactRespond(message.id, 'accepted')}>
                Accept
              </Button>
            </div>
          ) : (
            <p className={`text-xs ${isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
              Waiting for acceptance.
            </p>
          )
        ) : (
          <p className={`text-xs ${isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
            Request {metadata.status}.
          </p>
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
    <div className="flex h-[100svh] overflow-hidden bg-white dark:bg-gray-900">
      <div className="flex flex-col w-full">
        {/* Chat Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 pt-[calc(env(safe-area-inset-top)+8px)]">
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
              <MessageSearch 
                chatId={chatId} 
                onMessageClick={(messageId) => scrollToMessage(messageId)} 
              />
              {isGroupChat && (
                <button
                  onClick={() => setShowGroupSettings(true)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
              )}
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

        {showGroupSettings && chat && isGroupChat && (
          <GroupSettings
            chatId={chatId}
            groupName={chat.name || 'Group Chat'}
            groupDescription={chat.description}
            groupAvatar={resolveUrl(chat.avatar) || undefined}
            isAdmin={isGroupAdmin}
            onClose={() => setShowGroupSettings(false)}
            onUpdate={(data) => {
              setChat((prev) => (prev ? { ...prev, ...data } : prev))
            }}
          />
        )}

        {/* Messages Area */}
        <main
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 pt-5 pb-6 space-y-4"
        >
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
              const contactMetadata = message.type === 'CONTACT'
                ? parseContactMetadata(message.metadata)
                : null
              const contactContent = contactMetadata
                ? renderContactMessage(message, contactMetadata, isOwn)
                : null

              return (
                <div
                  key={message.id}
                  id={`message-${message.id}`}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-2 group`}
                >
                  {showAvatar && (
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center shrink-0">
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
                        onContextMenu={(event) => {
                          event.preventDefault()
                          setOpenMenuMessageId(message.id)
                        }}
                        onTouchStart={() => startLongPress(message.id)}
                        onTouchEnd={cancelLongPress}
                        onTouchMove={cancelLongPress}
                        onTouchCancel={cancelLongPress}
                        className={`rounded-2xl px-4 py-2 ${
                          isOwn
                            ? 'bg-blue-500 text-white dark:bg-blue-500 rounded-br-sm'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm'
                        } ${
                          highlightedMessageId === message.id
                            ? 'bg-yellow-200/40 dark:bg-yellow-200/20'
                            : ''
                        }`}
                      >
                        {message.isDeleted ? (
                          <p className="text-sm italic text-gray-200/90 dark:text-gray-300/90">
                            Message deleted
                          </p>
                        ) : contactContent ? (
                          contactContent
                        ) : message.type === 'FILE' || message.content.startsWith('📎') ? (
                          // Check for video, audio, images, then other files
                          renderVideoMessage(message) || renderAudioMessage(message) || renderImageMessage(message) || renderFileMessage(message)
                        ) : (
                          <>
                            {message.replyTo && (
                              <button
                                type="button"
                                onClick={() => scrollToMessage(message.replyTo!.id)}
                                className={`mb-2 rounded-lg border px-2 py-1 text-xs ${
                                  isOwn
                                    ? 'border-white/30 bg-white/10 text-white/90'
                                    : 'border-gray-200 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'
                                }`}
                              >
                                <p className="font-medium">
                                  Replying to {message.replyTo.sender.displayName}
                                </p>
                                <p className="truncate opacity-80">
                                  {message.replyTo.content}
                                </p>
                              </button>
                            )}
                            {(() => {
                              const metadata = normalizeMetadata(message.metadata)
                              if (!metadata?.forwardedFrom) return null
                              return (
                                <p
                                  className={`mb-1 text-[11px] uppercase tracking-wide ${
                                    isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-300'
                                  }`}
                                >
                                  Forwarded
                                </p>
                              )
                            })()}
                            <p className="text-sm whitespace-pre-wrap">
                              <MentionHighlight content={message.content} />
                              {(() => {
                                const content = message.content || ''
                                const endsWithEdited = /\(edited\)\s*$/i.test(content)
                                return message.isEdited && !endsWithEdited ? (
                                  <span className="text-xs opacity-70 ml-2">(edited)</span>
                                ) : null
                              })()}
                            </p>
                          </>
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
                      <div className={`absolute -top-3 ${isOwn ? '-left-3' : '-right-3'} z-10`}>
                        <MessageContextMenu
                          messageId={message.id}
                          chatId={chatId}
                          content={message.content}
                          isOwn={isOwn}
                          canDeleteForEveryone={isGroupAdmin}
                          isDeleted={message.isDeleted}
                          isEdited={message.isEdited}
                          createdAt={message.createdAt}
                          isInteractionDisabled={contactState.isBlocked}
                          onEdit={handleEditMessage}
                          onDelete={handleDeleteMessage}
                          onReply={handleReplyToMessage}
                          onForward={handleForwardMessage}
                          align={isOwn ? 'start' : 'end'}
                          side={isOwn ? 'left' : 'right'}
                          open={openMenuMessageId === message.id}
                          onOpenChange={(open) =>
                            setOpenMenuMessageId(open ? message.id : null)
                          }
                        />
                      </div>
                    </div>

                    {/* Message Reactions */}
                    <MessageReactions
                      messageId={message.id}
                      reactions={(message as any).reactions || []}
                      onAddReaction={handleAddReaction}
                      onRemoveReaction={handleRemoveReaction}
                      disabled={contactState.isBlocked}
                    />
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </main>

        {/* Message Input */}
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 pb-[calc(env(safe-area-inset-bottom)+8px)]">
          {!canSendMessages && chat?.type === 'PRIVATE' && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-100">
              {sendDisabledReason}
            </div>
          )}
          {replyToMessage && (
            <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Replying to {replyToMessage.sender.displayName}
                </p>
                <button
                  type="button"
                  onClick={() => scrollToMessage(replyToMessage.id)}
                  className="truncate text-left text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
                >
                  {replyToMessage.content}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setReplyToMessage(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Cancel reply"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFileUpload(true)}
              disabled={!canSendMessages}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>

            <button
              onClick={() => setShowAudioRecorder(true)}
              disabled={!canSendMessages}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Mic className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>

            <div className="flex-1 relative">
              {isGroupChat ? (
                <MentionInput
                  chatId={chatId}
                  value={newMessage}
                  onChange={setNewMessage}
                  onSubmit={handleSendMessage}
                  onFocus={handleTyping}
                  onBlur={handleStopTyping}
                  placeholder={canSendMessages ? 'Type a message...' : sendDisabledReason}
                  disabled={!canSendMessages}
                  className="pr-12 rounded-lg disabled:opacity-60"
                />
              ) : (
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
                  placeholder={canSendMessages ? 'Type a message...' : sendDisabledReason}
                  disabled={!canSendMessages}
                  className="pr-12 rounded-full disabled:opacity-60"
                />
              )}

              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full disabled:opacity-40"
                disabled={!canSendMessages}
              >
                <Smile className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !isConnected || !canSendMessages}
              className="rounded-full w-10 h-10 p-0 bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300"
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

          {/* Audio Recorder Modal */}
          {showAudioRecorder && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 m-4 max-w-md w-full">
                <h3 className="text-lg font-semibold mb-4">Record Voice Message</h3>
                <AudioRecorder
                  onRecordingComplete={handleAudioRecording}
                  onCancel={() => setShowAudioRecorder(false)}
                  maxDuration={300}
                />
              </div>
            </div>
          )}
        </footer>

        {/* Edit Message Dialog */}
        <EditMessageDialog
          isOpen={!!editingMessage}
          messageId={editingMessage?.id || ''}
          initialContent={editingMessage?.content || ''}
          createdAt={editingMessage?.createdAt || new Date().toISOString()}
          isLoading={isEditLoading}
          onClose={() => setEditingMessage(null)}
          onSave={handleSaveEdit}
        />

        <Dialog open={!!forwardMessage} onOpenChange={(open) => !open && setForwardMessage(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Forward message</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Add a note (optional)..."
                value={forwardNote}
                onChange={(event) => setForwardNote(event.target.value)}
              />
              <Input
                placeholder="Search chats..."
                value={forwardQuery}
                onChange={(event) => setForwardQuery(event.target.value)}
              />
              {forwardLoading && <p className="text-sm text-gray-500">Loading chats...</p>}
              {!forwardLoading && (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {forwardChats
                    .filter((chatItem) => chatItem.id !== chatId)
                    .filter((chatItem) =>
                      getForwardChatDisplayName(chatItem)
                        .toLowerCase()
                        .includes(forwardQuery.trim().toLowerCase())
                    )
                    .map((chatItem) => {
                      const displayName = getForwardChatDisplayName(chatItem)
                      const avatar = getForwardChatAvatar(chatItem)
                      const isSelected = forwardSelected.has(chatItem.id)
                      return (
                        <button
                          key={chatItem.id}
                          onClick={() => toggleForwardSelection(chatItem.id)}
                          className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30'
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center overflow-hidden">
                            {avatar ? (
                              <img src={avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-semibold text-blue-600 dark:text-blue-300">
                                {displayName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {displayName}
                            </p>
                            {chatItem.type === 'GROUP' && (
                              <p className="text-xs text-gray-500">
                                {chatItem.participants.length} members
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">
                              Selected
                            </span>
                          )}
                        </button>
                      )
                    })}
                  {!forwardLoading &&
                    forwardChats.filter((chatItem) => chatItem.id !== chatId).length === 0 && (
                      <p className="text-sm text-gray-500">No chats available.</p>
                    )}
                </div>
              )}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-500">
                  {forwardSelected.size} chat{forwardSelected.size === 1 ? '' : 's'} selected
                </p>
                <Button
                  onClick={handleForwardToSelected}
                  disabled={forwardSelected.size === 0}
                >
                  Forward
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
