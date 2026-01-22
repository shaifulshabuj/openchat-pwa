'use client'

import { useState } from 'react'
import { SmilePlus } from 'lucide-react'

interface MessageReactionsProps {
  messageId: string
  reactions: Array<{
    emoji: string
    count: number
    users: Array<{ id: string; displayName: string }>
    hasReacted: boolean
  }>
  onAddReaction: (messageId: string, emoji: string) => void
  onRemoveReaction: (messageId: string, emoji: string) => void
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡']

export function MessageReactions({ 
  messageId, 
  reactions, 
  onAddReaction, 
  onRemoveReaction 
}: MessageReactionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const handleReactionClick = (emoji: string, hasReacted: boolean) => {
    if (hasReacted) {
      onRemoveReaction(messageId, emoji)
    } else {
      onAddReaction(messageId, emoji)
    }
  }

  return (
    <div className="flex items-center gap-1 mt-1">
      {/* Existing Reactions */}
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleReactionClick(reaction.emoji, reaction.hasReacted)}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
            reaction.hasReacted
              ? 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
          }`}
          title={`${reaction.users.map(u => u.displayName).join(', ')} reacted with ${reaction.emoji}`}
        >
          <span>{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </button>
      ))}

      {/* Add Reaction Button */}
      <div className="relative">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
          title="Add reaction"
        >
          <SmilePlus className="w-3 h-3 text-gray-500 dark:text-gray-400" />
        </button>

        {/* Quick Emoji Picker */}
        {showEmojiPicker && (
          <div className="absolute top-8 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-2 z-10">
            <div className="flex gap-1">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onAddReaction(messageId, emoji)
                    setShowEmojiPicker(false)
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {showEmojiPicker && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowEmojiPicker(false)}
        />
      )}
    </div>
  )
}