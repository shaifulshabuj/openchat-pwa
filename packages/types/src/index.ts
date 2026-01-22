// User types
export interface User {
  id: string
  email: string
  username: string
  displayName: string
  avatar?: string
  status: 'online' | 'offline' | 'away' | 'busy'
  lastSeen?: Date
  createdAt: Date
  updatedAt: Date
}

// Message types
export interface Message {
  id: string
  content: string
  type: 'text' | 'image' | 'file' | 'voice' | 'video' | 'location' | 'contact'
  senderId: string
  chatId: string
  replyTo?: string
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

// Chat types
export interface Chat {
  id: string
  type: 'private' | 'group' | 'channel'
  name?: string
  description?: string
  avatar?: string
  participants: string[]
  admins: string[]
  lastMessage?: Message
  unreadCount: number
  createdAt: Date
  updatedAt: Date
}

// Real-time event types
export interface SocketEvents {
  // Connection events
  connect: () => void
  disconnect: () => void
  
  // Chat events
  'join-room': (roomId: string) => void
  'leave-room': (roomId: string) => void
  'send-message': (data: {
    roomId: string
    content: string
    userId: string
    type?: Message['type']
  }) => void
  'receive-message': (message: Message) => void
  
  // Typing events
  'typing-start': (data: { roomId: string, userId: string }) => void
  'typing-stop': (data: { roomId: string, userId: string }) => void
  'user-typing': (data: { userId: string, username: string }) => void
  'user-stop-typing': (data: { userId: string }) => void
  
  // Presence events
  'user-online': (userId: string) => void
  'user-offline': (userId: string) => void
  'user-status-change': (data: { userId: string, status: User['status'] }) => void
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Authentication types
export interface AuthUser {
  id: string
  email: string
  username: string
  displayName: string
  avatar?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  displayName: string
  password: string
}

export interface AuthResponse {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

// PWA types
export interface PWAInstallPrompt {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>
}

// Notification types
export interface PushNotification {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: Record<string, any>
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}