'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  disabled?: boolean
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡']

export function MessageReactions({ 
  messageId, 
  reactions, 
  onAddReaction, 
  onRemoveReaction,
  disabled = false
}: MessageReactionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [pickerPosition, setPickerPosition] = useState<{
    top: number
    left: number
    origin: string
  } | null>(null)
  const addButtonRef = useRef<HTMLButtonElement | null>(null)
  const pickerRef = useRef<HTMLDivElement | null>(null)

  const openPicker = () => {
    if (disabled) return
    setShowEmojiPicker(true)
  }

  const closePicker = () => {
    setShowEmojiPicker(false)
    setPickerPosition(null)
  }

  useEffect(() => {
    if (!showEmojiPicker) {
      return
    }

    const updatePosition = () => {
      const button = addButtonRef.current
      const picker = pickerRef.current
      if (!button || !picker) return

      const buttonRect = button.getBoundingClientRect()
      const pickerRect = picker.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const margin = 8
      const offset = 8

      let top = buttonRect.bottom + offset
      let origin = 'top left'
      if (top + pickerRect.height > viewportHeight - margin) {
        top = buttonRect.top - pickerRect.height - offset
        origin = 'bottom left'
      }

      let left = buttonRect.left
      if (left + pickerRect.width > viewportWidth - margin) {
        left = buttonRect.right - pickerRect.width
        origin = origin.replace('left', 'right')
      }

      if (left < margin) {
        left = margin
      }

      const originX = Math.min(
        Math.max(buttonRect.left + buttonRect.width / 2 - left, 0),
        pickerRect.width
      )
      const originY = Math.min(
        Math.max(buttonRect.top + buttonRect.height / 2 - top, 0),
        pickerRect.height
      )
      const originPx = `${originX}px ${originY}px`
      setPickerPosition({ top, left, origin: originPx })
    }

    requestAnimationFrame(() => {
      updatePosition()
    })

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [showEmojiPicker])

  const handleReactionClick = (emoji: string, hasReacted: boolean) => {
    if (disabled) return
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
          disabled={disabled}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
            reaction.hasReacted
              ? 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={`${reaction.users.map(u => u.displayName).join(', ')} reacted with ${reaction.emoji}`}
        >
          <span>{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </button>
      ))}

      {/* Add Reaction Button */}
      <div className="relative">
        <button
          ref={addButtonRef}
          onClick={() => (showEmojiPicker ? closePicker() : openPicker())}
          disabled={disabled}
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title="Add reaction"
        >
          <SmilePlus className="w-3 h-3 text-gray-500 dark:text-gray-400" />
        </button>

        {/* Quick Emoji Picker */}
        {showEmojiPicker &&
          typeof document !== 'undefined' &&
          createPortal(
            <div className="fixed inset-0 z-40">
              <button
                type="button"
                className="absolute inset-0 cursor-default"
                onClick={closePicker}
                aria-label="Close reactions"
              />
              <div
                ref={pickerRef}
                className="fixed z-50 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-600 dark:bg-gray-800"
                style={{
                  top: pickerPosition?.top ?? 0,
                  left: pickerPosition?.left ?? 0,
                  transformOrigin: pickerPosition?.origin ?? 'top left',
                  visibility: pickerPosition ? 'visible' : 'hidden',
                  pointerEvents: pickerPosition ? 'auto' : 'none',
                }}
              >
                <div className="flex gap-1">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        if (disabled) return
                        onAddReaction(messageId, emoji)
                        closePicker()
                      }}
                      disabled={disabled}
                      className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                        disabled ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      title={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>,
            document.body
          )}
      </div>

    </div>
  )
}
