import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('API Error:', error.response?.status, error.response?.statusText, error.config?.url)
    
    if (error.response?.status === 401) {
      // Only redirect on specific auth endpoints, not all 401s
      const isAuthEndpoint = error.config?.url?.includes('/auth/')
      
      if (isAuthEndpoint || error.response?.data?.error === 'Invalid token') {
        // Clear invalid token
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_data')
        
        // Only redirect if we're not already on the login page
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/login')) {
          console.log('Token invalid, redirecting to login')
          window.location.href = '/auth/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

// Types
export interface User {
  id: string
  email: string
  username: string
  displayName: string
  bio?: string
  avatar?: string
  status: 'ONLINE' | 'OFFLINE' | 'AWAY' | 'BUSY'
  lastSeen?: string
  createdAt: string
}

export interface AuthResponse {
  success: boolean
  data: {
    user: User
    token: string
  }
}

export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  username: string
  displayName: string
  password: string
}

export interface PasswordResetRequestData {
  email: string
}

export interface PasswordResetConfirmData {
  token: string
  password: string
}

export interface Chat {
  id: string
  type: 'PRIVATE' | 'GROUP' | 'CHANNEL'
  name?: string
  description?: string
  avatar?: string
  participants: Array<{
    user: User
    joinedAt: string
  }>
  admins?: Array<{
    user: {
      id: string
      username: string
      displayName: string
    }
  }>
  lastMessage?: Message
  unreadCount: number
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  content: string
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'VOICE' | 'VIDEO' | 'LOCATION' | 'CONTACT'
  senderId: string
  chatId: string
  replyToId?: string
  metadata?: Record<string, any>
  isEdited: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  sender: {
    id: string
    username: string
    displayName: string
    avatar?: string
  }
  replyTo?: Message
}

export type MessageDeleteScope = 'me' | 'everyone'

export interface ChatInvitation {
  id: string
  code: string
  chatId: string
  createdById: string
  expiresAt: string
  revokedAt?: string | null
  createdAt: string
}

// Auth API functions
export const authAPI = {
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post('/api/auth/login', data)
    return response.data
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/api/auth/register', data)
    return response.data
  },

  async getProfile(): Promise<{ success: boolean; data: User }> {
    const response = await api.get('/api/auth/me')
    return response.data
  },

  async updateProfile(data: Partial<User>): Promise<{ success: boolean; data: User }> {
    const response = await api.patch('/api/auth/me', data)
    return response.data
  },

  async logout(): Promise<{ success: boolean }> {
    const response = await api.post('/api/auth/logout')
    return response.data
  },

  async requestPasswordReset(data: PasswordResetRequestData): Promise<{ success: boolean; message?: string }> {
    const response = await api.post('/api/auth/password-reset/request', data)
    return response.data
  },

  async confirmPasswordReset(data: PasswordResetConfirmData): Promise<{ success: boolean; message?: string }> {
    const response = await api.post('/api/auth/password-reset/confirm', data)
    return response.data
  },
}

// Chat API functions
export const chatAPI = {
  async getChats(includeArchived = false): Promise<{ success: boolean; data: Chat[] }> {
    const response = await api.get('/api/chats', {
      params: includeArchived ? { includeArchived: 'true' } : {}
    })
    return response.data
  },

  async createChat(data: {
    type: 'PRIVATE' | 'GROUP' | 'CHANNEL'
    name?: string
    description?: string
    participants: string[]
  }): Promise<{ success: boolean; data: Chat }> {
    const response = await api.post('/api/chats', data)
    return response.data
  },

  async getChatDetails(chatId: string): Promise<{ success: boolean; data: Chat }> {
    const response = await api.get(`/api/chats/${chatId}`)
    return response.data
  },

  async getChatMessages(
    chatId: string,
    page = 1,
    limit = 50
  ): Promise<{
    success: boolean
    data: Message[]
    pagination: { page: number; limit: number; hasMore: boolean }
  }> {
    const response = await api.get(`/api/chats/${chatId}/messages`, {
      params: { page, limit }
    })
    return response.data
  },

  async sendMessage(chatId: string, data: {
    content: string
    type?: string
    replyToId?: string
    metadata?: Record<string, any>
  }): Promise<{ success: boolean; data: Message }> {
    const response = await api.post(`/api/chats/${chatId}/messages`, data)
    return response.data
  },

  async joinChat(chatId: string): Promise<{ success: boolean }> {
    const response = await api.post(`/api/chats/${chatId}/join`)
    return response.data
  },

  async leaveChat(chatId: string): Promise<{ success: boolean }> {
    const response = await api.post(`/api/chats/${chatId}/leave`)
    return response.data
  },

  async editMessage(chatId: string, messageId: string, data: {
    content: string
  }): Promise<{ success: boolean; data: Message }> {
    const response = await api.put(`/api/chats/${chatId}/messages/${messageId}`, data)
    return response.data
  },

  async deleteMessage(
    chatId: string,
    messageId: string,
    scope: MessageDeleteScope = 'everyone'
  ): Promise<{ success: boolean; scope?: MessageDeleteScope }> {
    const response = await api.delete(`/api/chats/${chatId}/messages/${messageId}`, {
      data: { scope }
    })
    return response.data
  },

  async pinChat(chatId: string, isPinned: boolean): Promise<{ success: boolean; message: string }> {
    const response = await api.put(`/api/chats/${chatId}/pin`, { isPinned })
    return response.data
  },

  async archiveChat(chatId: string, isArchived: boolean): Promise<{ success: boolean; message: string }> {
    const response = await api.put(`/api/chats/${chatId}/archive`, { isArchived })
    return response.data
  },

  async searchMessages(chatId: string, query: string, page = 1, limit = 20): Promise<{ 
    success: boolean; 
    data: Message[]; 
    pagination: { page: number; limit: number; hasMore: boolean }; 
    query: string 
  }> {
    const response = await api.get(`/api/chats/${chatId}/messages/search`, {
      params: { q: query, page, limit }
    })
    return response.data
  },

  // Group Management
  async getGroupMembers(chatId: string) {
    const response = await api.get(`/api/chats/${chatId}/members`)
    return response.data
  },

  async addGroupMember(chatId: string, userId: string) {
    const response = await api.post(`/api/chats/${chatId}/members`, { userId })
    return response.data
  },

  async removeGroupMember(chatId: string, userId: string) {
    const response = await api.delete(`/api/chats/${chatId}/members/${userId}`)
    return response.data
  },

  async promoteAdmin(chatId: string, userId: string) {
    const response = await api.post(`/api/chats/${chatId}/admins`, { userId })
    return response.data
  },

  async demoteAdmin(chatId: string, userId: string) {
    const response = await api.delete(`/api/chats/${chatId}/admins/${userId}`)
    return response.data
  },

  async updateGroupSettings(chatId: string, data: { name?: string, description?: string, avatar?: string }) {
    const response = await api.put(`/api/chats/${chatId}/settings`, data)
    return response.data
  },

  // Group Invitations
  async createGroupInvitation(chatId: string, data?: { expiresInHours?: number; expiresAt?: string }) {
    const response = await api.post(`/api/chats/${chatId}/invitations`, data ?? {})
    return response.data as { success: boolean; data: ChatInvitation }
  },

  async validateInvitation(code: string) {
    const response = await api.get(`/api/chats/invitations/${code}`)
    return response.data as {
      success: boolean
      data: {
        invitation: Pick<ChatInvitation, 'id' | 'code' | 'expiresAt' | 'createdAt'>
        chat: { id: string; name?: string; description?: string; avatar?: string; memberCount: number }
      }
    }
  },

  async acceptInvitation(code: string) {
    const response = await api.post(`/api/chats/invitations/${code}/accept`)
    return response.data as { success: boolean; data: { chatId: string; alreadyMember: boolean } }
  },

  async revokeInvitation(chatId: string, invitationId: string) {
    const response = await api.delete(`/api/chats/${chatId}/invitations/${invitationId}`)
    return response.data as { success: boolean; data: ChatInvitation }
  },
}

// Reactions API functions
export const reactionsAPI = {
  async addReaction(messageId: string, emoji: string): Promise<{ 
    success: boolean; 
    action: 'added' | 'removed';
    reaction: any 
  }> {
    const response = await api.post('/api/reactions/add', { messageId, emoji })
    return response.data
  },

  async removeReaction(messageId: string, emoji: string): Promise<{ success: boolean }> {
    const response = await api.delete('/api/reactions/remove', { 
      data: { messageId, emoji }
    })
    return response.data
  },

  async getMessageReactions(messageId: string): Promise<{ 
    success: boolean; 
    data: {
      messageId: string;
      reactions: Array<{
        emoji: string;
        count: number;
        users: Array<{ id: string; username: string; displayName: string; avatar?: string }>;
      }>;
      totalReactions: number;
    }
  }> {
    const response = await api.get(`/api/reactions/${messageId}`)
    return response.data
  },
}

// Message Status API functions
export const messageStatusAPI = {
  async markAsRead(messageIds: string[]): Promise<{
    success: boolean;
    message: string;
    markedCount: number;
    readStatuses: Array<{ messageId: string; readAt: string }>;
  }> {
    const response = await api.post('/api/message-status/mark-read', { messageIds })
    return response.data
  },

  async getReadBy(messageId: string): Promise<{
    success: boolean;
    data: {
      messageId: string;
      readBy: Array<{
        user: { id: string; username: string; displayName: string; avatar?: string };
        readAt: string;
      }>;
      readCount: number;
      totalParticipants: number;
      allRead: boolean;
    };
  }> {
    const response = await api.get(`/api/message-status/${messageId}/read-by`)
    return response.data
  },
}

// Users API functions
export const usersAPI = {
  async searchUsers(query: string): Promise<{ success: boolean; data: User[] }> {
    const response = await api.get('/api/users/search', {
      params: { q: query }
    })
    return response.data
  },
}
