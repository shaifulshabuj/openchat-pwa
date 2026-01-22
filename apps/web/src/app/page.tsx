'use client'

import { useState } from 'react'
import { MessageSquare, Users, Settings, Phone, Search, MoreHorizontal } from 'lucide-react'

export default function Home() {
  const [activeTab, setActiveTab] = useState('chats')

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* Mobile Layout - Full Screen */}
      <div className="flex flex-col w-full">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              OpenChat
            </h1>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <Search className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <MoreHorizontal className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </header>

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
              {/* Welcome Message */}
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <MessageSquare className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Welcome to OpenChat!
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 max-w-sm">
                    Your open-source, cross-platform messaging app. Start chatting with friends and family.
                  </p>
                  <button className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full font-medium transition-colors">
                    Start Messaging
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Contacts Yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Add contacts to start chatting
                </p>
              </div>
            </div>
          )}

          {activeTab === 'calls' && (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center">
                <Phone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Recent Calls
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Voice and video calls will appear here
                </p>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="h-full p-4">
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    Account
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Manage your profile and account settings
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    Privacy & Security
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Control your privacy and security settings
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    Notifications
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Customize your notification preferences
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
