import { Suspense } from 'react'
import { ChatQueryClient } from './ChatQueryClient'

export default function ChatFallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <p className="text-gray-600">Loading chat...</p>
        </div>
      }
    >
      <ChatQueryClient />
    </Suspense>
  )
}
