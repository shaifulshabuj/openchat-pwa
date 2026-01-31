'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { chatAPI } from '@/lib/api'

interface User {
  id: string
  username: string
  displayName: string
  avatar?: string
  status?: string
}

interface MentionInputProps {
  chatId: string
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function MentionInput({
  chatId,
  value,
  onChange,
  onSubmit,
  onFocus,
  onBlur,
  placeholder = 'Type a message...',
  className = '',
  disabled = false
}: MentionInputProps) {
  const [members, setMembers] = useState<User[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<User[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load group members for mentions
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const response = await chatAPI.getGroupMembers(chatId)
        if (response.success) {
          setMembers(response.data)
        }
      } catch (error) {
        console.error('Failed to load group members:', error)
        setMembers([])
      }
    }

    loadMembers()
  }, [chatId])

  // Handle text change and mention detection
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    const cursorPos = e.target.selectionStart
    
    // Find @ symbol before cursor
    const textBeforeCursor = newValue.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      // Check if @ is at start or after whitespace
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' '
      if (charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtIndex === 0) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
        
        // Check if there's no space after @, meaning we're still in mention
        if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
          const query = textAfterAt.toLowerCase()
          const filtered = members.filter(member =>
            member.username.toLowerCase().includes(query) ||
            member.displayName.toLowerCase().includes(query)
          )
          
          if (filtered.length > 0) {
            setSuggestions(filtered)
            setMentionStart(lastAtIndex)
            setShowSuggestions(true)
            setSelectedIndex(0)
            return
          }
        }
      }
    }
    
    // Hide suggestions if no valid mention context
    setShowSuggestions(false)
    setMentionStart(null)
  }

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % suggestions.length)
          return
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
          return
        case 'Tab':
        case 'Enter':
          if (e.shiftKey && e.key === 'Enter') {
            // Allow Shift+Enter for new line
            return
          }
          e.preventDefault()
          if (e.key === 'Tab' || (e.key === 'Enter' && showSuggestions)) {
            insertMention(suggestions[selectedIndex])
          } else if (e.key === 'Enter' && !showSuggestions) {
            onSubmit(value)
          }
          return
        case 'Escape':
          e.preventDefault()
          setShowSuggestions(false)
          return
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit(value)
    }
  }

  // Insert selected mention into text
  const insertMention = (user: User) => {
    if (mentionStart === null || !textareaRef.current) return

    const textarea = textareaRef.current
    const cursorPos = textarea.selectionStart
    const textBeforeMention = value.slice(0, mentionStart)
    const textAfterCursor = value.slice(cursorPos)
    
    const mention = `@${user.username}`
    const newValue = textBeforeMention + mention + ' ' + textAfterCursor
    const newCursorPos = textBeforeMention.length + mention.length + 1

    onChange(newValue)
    setShowSuggestions(false)
    setMentionStart(null)

    // Set cursor position after mention
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  // Click suggestion to select
  const handleSuggestionClick = (user: User) => {
    insertMention(user)
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full min-h-[44px] max-h-32 px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${className}`}
        rows={1}
        style={{ height: 'auto' }}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement
          target.style.height = 'auto'
          target.style.height = Math.min(target.scrollHeight, 128) + 'px'
        }}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
          {suggestions.map((user, index) => (
            <button
              key={user.id}
              className={`w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 ${
                index === selectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
              onClick={() => handleSuggestionClick(user)}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.displayName}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-400 dark:bg-gray-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {user.displayName}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  @{user.username}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}