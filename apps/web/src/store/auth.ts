import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authAPI, type User, type AuthResponse } from '../lib/api'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>
  register: (data: {
    email: string
    username: string
    displayName: string
    password: string
  }) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  setUser: (user: User) => void
  clearError: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const response: AuthResponse = await authAPI.login({ email, password })

          if (response.success) {
            const { user, token } = response.data

            // Store token in localStorage for API client
            if (typeof window !== 'undefined') {
              localStorage.setItem('auth_token', token)
              localStorage.setItem('user_data', JSON.stringify(user))
            }

            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            })
          } else {
            throw new Error('Login failed')
          }
        } catch (error: any) {
          console.error('Login error details:', error)
          const errorMessage =
            error.response?.data?.error ||
            error.message ||
            'Login failed. Please check your credentials.'
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
            user: null,
            token: null,
          })

          // Clear any stale tokens
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token')
            localStorage.removeItem('user_data')
          }

          throw error
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const response: AuthResponse = await authAPI.register(data)

          if (response.success) {
            const { user, token } = response.data

            // Store token in localStorage for API client
            if (typeof window !== 'undefined') {
              localStorage.setItem('auth_token', token)
            }

            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            })
          } else {
            throw new Error('Registration failed')
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || 'Registration failed'
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
            user: null,
            token: null,
          })
          throw error
        }
      },

      logout: async () => {
        try {
          // Call logout endpoint (optional)
          await authAPI.logout()
        } catch (error) {
          // Continue with logout even if API call fails
          console.error('Logout API call failed:', error)
        } finally {
          // Clear local storage
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user_data')

          // Reset state
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authAPI.updateProfile(data)

          if (response.success) {
            set({
              user: response.data,
              isLoading: false,
              error: null,
            })
          } else {
            throw new Error('Profile update failed')
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || 'Profile update failed'
          set({
            error: errorMessage,
            isLoading: false,
          })
          throw error
        }
      },

      setUser: (user: User) => {
        set({ user })
      },

      clearError: () => {
        set({ error: null })
      },

      checkAuth: async () => {
        // Ensure we're in browser environment
        if (typeof window === 'undefined') {
          return
        }

        const token = localStorage.getItem('auth_token')

        if (!token) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          })
          return
        }

        // Skip check if already authenticated and not expired
        const state = get()
        if (state.isAuthenticated && state.user && state.token === token) {
          return
        }

        set({ isLoading: true })

        try {
          const response = await authAPI.getProfile()

          if (response.success) {
            set({
              user: response.data,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            })
          } else {
            throw new Error('Invalid token')
          }
        } catch (error) {
          console.log('Auth check failed:', error)
          // Token is invalid, clear it
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user_data')

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
