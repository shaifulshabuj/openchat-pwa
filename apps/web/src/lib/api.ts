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
    if (error.response?.status === 401) {
      // Clear invalid token
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_data')
      
      // Redirect to login (you can customize this)
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login'
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
}

// Chat API functions
export const chatAPI = {
  async getChats(): Promise<{ success: boolean; data: Chat[] }> {
    const response = await api.get('/api/chats')
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