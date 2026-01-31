import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../store/auth'

export interface SocketEvents {
  'new-message': (data: { message: any; chatId: string }) => void
  'user-typing': (data: { userId: string; username: string; chatId: string }) => void
  'user-stopped-typing': (data: { userId: string; chatId: string }) => void
  'user-status-changed': (data: { userId: string; username: string; status: string; lastSeen: Date }) => void
  'joined-chat': (data: { chatId: string }) => void
  'left-chat': (data: { chatId: string }) => void
  'message-edited': (data: { message: any; chatId: string }) => void
  'message-deleted': (data: { messageId: string; chatId: string; deletedBy: string }) => void
  'message-deleted-for-me': (data: { messageId: string; chatId: string; deletedBy: string }) => void
  'reaction-added': (data: { messageId: string; reaction: any }) => void
  'reaction-removed': (data: { messageId: string; userId: string; emoji: string; reactionId: string }) => void
  'messages-read': (data: { userId: string; messageIds: string[]; readAt: string; chatId: string }) => void
  'error': (data: { message: string }) => void
}

let sharedSocket: Socket | null = null
let sharedSubscribers = 0
let disconnectTimer: number | null = null
const OFFLINE_GRACE_MS = 5000
const SHARED_SOCKET_DISCONNECT_DELAY_MS = 10000

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [isOnline, setIsOnline] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { token, isAuthenticated } = useAuthStore()
  const socketRef = useRef<Socket | null>(null)
  const disconnectTimerRef = useRef<number | null>(null)
  const offlineTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Disconnect if not authenticated
      if (sharedSocket) {
        sharedSocket.disconnect()
        sharedSocket = null
      }
      setIsConnected(false)
      setIsOnline(false)
      return
    }

    // Connect to socket
    const socketURL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8001'
    
    if (disconnectTimer) {
      window.clearTimeout(disconnectTimer)
      disconnectTimer = null
    }

    if (!sharedSocket) {
      sharedSocket = io(socketURL, {
        auth: {
          token: token
        },
        autoConnect: true
      })
    }

    sharedSubscribers += 1
    socketRef.current = sharedSocket
    if (!sharedSocket.connected) {
      sharedSocket.connect()
    }
    setIsConnected(sharedSocket.connected)
    if (sharedSocket.connected) {
      setIsOnline(true)
    }

    // Connection event handlers
    const handleConnect = () => {
      console.log('Socket connected')
      if (disconnectTimerRef.current) {
        window.clearTimeout(disconnectTimerRef.current)
        disconnectTimerRef.current = null
      }
      if (offlineTimerRef.current) {
        window.clearTimeout(offlineTimerRef.current)
        offlineTimerRef.current = null
      }
      if (disconnectTimer) {
        window.clearTimeout(disconnectTimer)
        disconnectTimer = null
      }
      setIsConnected(true)
      setIsOnline(true)
      setError(null)
    }

    const handleDisconnect = () => {
      console.log('Socket disconnected')
      if (disconnectTimerRef.current) {
        window.clearTimeout(disconnectTimerRef.current)
      }
      disconnectTimerRef.current = window.setTimeout(() => {
        setIsConnected(false)
      }, 400)
      if (offlineTimerRef.current) {
        window.clearTimeout(offlineTimerRef.current)
      }
      offlineTimerRef.current = window.setTimeout(() => {
        setIsOnline(false)
      }, OFFLINE_GRACE_MS)
    }

    const handleConnectError = (error: Error) => {
      console.error('Socket connection error:', error)
      if (disconnectTimerRef.current) {
        window.clearTimeout(disconnectTimerRef.current)
        disconnectTimerRef.current = null
      }
      setError(error.message)
      setIsConnected(false)
    }

    sharedSocket.on('connect', handleConnect)
    sharedSocket.on('disconnect', handleDisconnect)
    sharedSocket.on('connect_error', handleConnectError)

    return () => {
      if (disconnectTimerRef.current) {
        window.clearTimeout(disconnectTimerRef.current)
        disconnectTimerRef.current = null
      }
      if (offlineTimerRef.current) {
        window.clearTimeout(offlineTimerRef.current)
        offlineTimerRef.current = null
      }
      if (sharedSocket) {
        sharedSocket.off('connect', handleConnect)
        sharedSocket.off('disconnect', handleDisconnect)
        sharedSocket.off('connect_error', handleConnectError)
      }
      sharedSubscribers = Math.max(0, sharedSubscribers - 1)
      if (sharedSubscribers === 0 && sharedSocket) {
        if (disconnectTimer) {
          window.clearTimeout(disconnectTimer)
        }
        disconnectTimer = window.setTimeout(() => {
          sharedSocket?.disconnect()
          sharedSocket = null
          disconnectTimer = null
          setIsConnected(false)
          setIsOnline(false)
        }, SHARED_SOCKET_DISCONNECT_DELAY_MS)
      }
    }
  }, [isAuthenticated, token])

  // Socket methods
  const emit = <T extends keyof SocketEvents>(event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    }
  }

  const on = <T extends keyof SocketEvents>(event: string, callback: SocketEvents[T]) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback as any)
    }
  }

  const off = (event: string, callback?: Function) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback as any)
    }
  }

  const joinChat = (chatId: string) => {
    emit('join-chat', { chatId })
  }

  const leaveChat = (chatId: string) => {
    emit('leave-chat', { chatId })
  }

  const sendMessage = (chatId: string, content: string, type = 'TEXT', replyToId?: string) => {
    emit('send-message', { chatId, content, type, replyToId })
  }

  const startTyping = (chatId: string, userId: string, username: string) => {
    emit('typing-start', { chatId, userId, username })
  }

  const stopTyping = (chatId: string, userId: string) => {
    emit('typing-stop', { chatId, userId })
  }

  const updateStatus = (status: 'ONLINE' | 'AWAY' | 'BUSY') => {
    emit('update-status', { status })
  }

  return {
    socket: socketRef.current,
    isConnected,
    isOnline,
    error,
    emit,
    on,
    off,
    joinChat,
    leaveChat,
    sendMessage,
    startTyping,
    stopTyping,
    updateStatus
  }
}
