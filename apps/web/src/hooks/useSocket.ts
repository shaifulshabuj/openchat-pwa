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
  'error': (data: { message: string }) => void
}

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { token, isAuthenticated } = useAuthStore()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Disconnect if not authenticated
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      setIsConnected(false)
      return
    }

    // Connect to socket
    const socketURL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8001'
    
    const socket = io(socketURL, {
      auth: {
        token: token
      },
      autoConnect: true
    })

    socketRef.current = socket

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Socket connected')
      setIsConnected(true)
      setError(null)
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setError(error.message)
      setIsConnected(false)
    })

    return () => {
      socket.disconnect()
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