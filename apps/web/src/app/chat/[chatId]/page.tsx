'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Smile, Paperclip, Phone, Video, MoreVertical } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSocket } from '@/hooks/useSocket'
import { chatAPI, type Chat, type Message } from '@/lib/api'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface ChatPageProps {
  params: { chatId: string }
}

export default function ChatPage({ params }: ChatPageProps) {
  const { chatId } = params
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [chat, setChat] = useState<Chat | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTyping, setIsTyping] = useState<string[]>([])
  
  const { user } = useAuthStore()
  const { isConnected, on, off, joinChat, sendMessage, startTyping, stopTyping } = useSocket()
  const router = useRouter()

  // Load chat details and messages
  useEffect(() => {
    const loadChatData = async () => {
      try {
        const [chatResponse, messagesResponse] = await Promise.all([
          chatAPI.getChatDetails(chatId),
          chatAPI.getChatMessages(chatId)
        ])
        
        if (chatResponse.success) {
          setChat(chatResponse.data)
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
          setMessages(prev => [...prev, message])
        }
      })

      // Listen for typing indicators
      on('user-typing', ({ userId, username }: { userId: string; username: string }) => {
        if (userId !== user?.id) {
          setIsTyping(prev => [...prev.filter(u => u !== username), username])
        }
      })

      on('user-stopped-typing', ({ userId }: { userId: string }) => {
        if (userId !== user?.id) {
          setIsTyping(prev => prev.filter(u => u !== userId))
        }
      })

      return () => {
        off('new-message')
        off('user-typing')
        off('user-stopped-typing')
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
    const otherUser = chat.participants.find(p => p.user.id !== user?.id)
    return otherUser?.user.displayName || 'Private Chat'
  }

  const getChatAvatar = () => {
    if (chat?.avatar) return chat.avatar
    
    if (chat?.type === 'PRIVATE') {
      const otherUser = chat.participants.find(p => p.user.id !== user?.id)
      return otherUser?.user.avatar
    }
    
    return null
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
                    {isConnected ? 'Online' : 'Connecting...'}
                    {isTyping.length > 0 && (
                      <span className="text-green-600">
                        {' • '}{isTyping.join(', ')} typing...
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
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-2`}
                >
                  {showAvatar && (
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        {message.sender.displayName.charAt(0)}
                      </span>
                    </div>
                  )}
                  
                  <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-1' : ''}`}>
                    {!isOwn && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 px-3">
                        {message.sender.displayName}
                      </p>
                    )}
                    
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isOwn
                          ? 'bg-green-500 text-white rounded-br-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        isOwn ? 'text-green-100' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {dayjs(message.createdAt).fromNow()}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </main>

        {/* Message Input */}
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
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
        </footer>
      </div>
    </div>
  )
}