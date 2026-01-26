'use client'

import { useSearchParams } from 'next/navigation'
import ChatPage from './[chatId]/page'

export const ChatQueryClient = () => {
  const searchParams = useSearchParams()
  const chatId = searchParams.get('chatId')

  if (!chatId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600">Select a chat to get started.</p>
      </div>
    )
  }

  return <ChatPage params={Promise.resolve({ chatId })} />
}
