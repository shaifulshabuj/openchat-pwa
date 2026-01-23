'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    console.error('Auth Error Boundary caught error:', error)
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log error for debugging
    console.error('Auth Error Boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        this.props.fallback || (
          <div className="flex h-screen items-center justify-center">
            <div className="text-center p-8 max-w-md">
              <div className="text-red-500 mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Authentication Error
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                There was a problem loading your authentication state. This might be a temporary issue.
              </p>
              <button
                onClick={() => {
                  // Clear auth storage and reload
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('auth_token')
                    localStorage.removeItem('user_data')
                    localStorage.removeItem('auth-storage')
                    window.location.href = '/auth/login'
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Reset & Login Again
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}