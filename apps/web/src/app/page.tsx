'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare,
  Users,
  Settings,
  Phone,
  Search,
  MoreHorizontal,
  Plus,
  Send,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useSocket } from '@/hooks/useSocket'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChatList } from '@/components/ChatList'
import { DarkModeToggle } from '@/components/ui/DarkModeToggle'

export default function Home() {
  const [activeTab, setActiveTab] = useState('chats')
  const [message, setMessage] = useState('')
  const [mounted, setMounted] = useState(false)
  const { user, isAuthenticated, isLoading, logout, checkAuth } = useAuthStore()
  const { isConnected, joinChat, sendMessage } = useSocket()
  const router = useRouter()

  // Handle hydration mismatch for static export
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check authentication on mount
  useEffect(() => {
    if (mounted) {
      checkAuth()
    }
  }, [checkAuth, mounted])

  // Redirect to login if not authenticated (but allow time for auth check to complete)
  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated && user === null) {
      router.push('/auth/login')
    }
  }, [mounted, isLoading, isAuthenticated, user, router])

  const handleLogout = async () => {
    await logout()
    router.push('/auth/login')
  }

  const handleSendMessage = () => {
    if (message.trim() && isConnected) {
      // This is a demo - in real app you'd have a selected chat
      sendMessage('demo-chat', message.trim())
      setMessage('')
    }
  }

  // Show loading state during initial hydration or auth check
  if (!mounted || isLoading || (!isAuthenticated && user === null)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{!mounted ? 'Initializing...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* Mobile Layout - Full Screen */}
      <div className="flex flex-col w-full">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">OpenChat</h1>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                ></div>
                <span className="text-xs text-gray-500">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <Search className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <DarkModeToggle />
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <MoreHorizontal className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </header>

        {/* User Info */}
        {user && (
          <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-green-800 dark:text-green-200">
              Welcome back, <span className="font-medium">{user.displayName}</span>!
            </p>
            <p className="text-xs text-green-600 dark:text-green-300">
              @{user.username} • Status: {user.status}
            </p>
          </div>
        )}

        {/* Tab Navigation */}
        <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            {[
              { id: 'chats', label: 'Chats', icon: MessageSquare },
              { id: 'contacts', label: 'Contacts', icon: Users },
              { id: 'calls', label: 'Calls', icon: Phone },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-green-500 text-green-600 dark:text-green-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden">
          {activeTab === 'chats' && (
            <div className="h-full flex flex-col">
              {/* Chat List */}
              <div className="flex-1 overflow-y-auto">
                <ChatList />
              </div>

              {/* Floating Action Button */}
              <div className="absolute bottom-6 right-6">
                <button className="w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors">
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Contact Management Ready
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm max-w-sm">
                  User search API endpoint implemented. Contact management features coming in next
                  phase.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'calls' && (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center">
                <Phone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Voice & Video Calls
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  WebRTC integration planned for Phase 2
                </p>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="h-full p-4">
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    Account Settings
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Profile management and preferences
                  </p>
                  <Button onClick={handleLogout} variant="outline" size="sm">
                    Sign Out
                  </Button>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    Development Info
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p>Frontend: React 19 + Next.js 16</p>
                    <p>Backend: Node.js + Fastify + Socket.io</p>
                    <p>Database: PostgreSQL + Prisma</p>
                    <p>Auth: JWT tokens + bcrypt</p>
                    <p>Real-time: Socket.io with Redis adapter</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
