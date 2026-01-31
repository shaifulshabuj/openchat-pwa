import { useState, useRef, useEffect } from 'react'
import { Search, X, ChevronUp, ChevronDown, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  content: string
  createdAt: string
  sender: {
    id: string
    username: string
    displayName: string | null
    avatar: string | null
  }
  replyTo?: {
    id: string
    content: string
    sender: {
      id: string
      username: string
      displayName: string | null
    }
  } | null
}

interface MessageSearchProps {
  chatId: string
  onMessageClick?: (messageId: string) => void
  className?: string
}

interface SearchResult {
  success: boolean
  data: Message[]
  pagination: {
    page: number
    limit: number
    hasMore: boolean
  }
  query: string
}

export default function MessageSearch({ 
  chatId, 
  onMessageClick, 
  className 
}: MessageSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [totalResults, setTotalResults] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced search
  const performSearch = async (searchQuery: string, page = 1) => {
    if (!searchQuery.trim()) {
      setResults([])
      setTotalResults(0)
      setCurrentIndex(0)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        page: page.toString(),
        limit: '20'
      })

      const response = await fetch(
        `/api/chats/${chatId}/messages/search?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      )

      if (response.ok) {
        const data: SearchResult = await response.json()
        if (page === 1) {
          setResults(data.data)
          setTotalResults(data.data.length)
          setCurrentIndex(data.data.length > 0 ? 1 : 0)
        } else {
          setResults(prev => [...prev, ...data.data])
          setTotalResults(prev => prev + data.data.length)
        }
        setHasMore(data.pagination.hasMore)
      } else {
        console.error('Search failed:', response.status)
        setResults([])
        setTotalResults(0)
        setCurrentIndex(0)
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
      setTotalResults(0)
      setCurrentIndex(0)
    }
    setLoading(false)
  }

  // Handle query changes with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, chatId])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setQuery('')
      setResults([])
    } else if (e.key === 'Enter' && results.length > 0) {
      const currentResult = results[currentIndex - 1]
      if (currentResult && onMessageClick) {
        onMessageClick(currentResult.id)
        setIsOpen(false)
      }
    }
  }

  const navigateResults = (direction: 'up' | 'down') => {
    if (results.length === 0) return
    
    let newIndex = currentIndex
    if (direction === 'down') {
      newIndex = currentIndex < totalResults ? currentIndex + 1 : 1
    } else {
      newIndex = currentIndex > 1 ? currentIndex - 1 : totalResults
    }
    
    setCurrentIndex(newIndex)
    
    // Jump to the message
    const resultIndex = newIndex - 1
    if (results[resultIndex] && onMessageClick) {
      onMessageClick(results[resultIndex].id)
    }
  }

  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text
    
    const regex = new RegExp(`(${searchQuery})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => (
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-600/30 rounded px-0.5">
          {part}
        </mark>
      ) : part
    ))
  }

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={cn("h-8 w-8 p-0", className)}
        title="Search messages"
      >
        <Search className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      {/* Search Input Bar */}
      <div className="flex items-center space-x-2 bg-background border rounded-lg p-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search messages..."
          className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        
        {loading && <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />}
        
        {/* Navigation Controls */}
        {totalResults > 0 && (
          <div className="flex items-center space-x-1">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {currentIndex} of {totalResults}
            </span>
            <div className="flex">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateResults('up')}
                className="h-6 w-6 p-0"
                disabled={totalResults === 0}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateResults('down')}
                className="h-6 w-6 p-0"
                disabled={totalResults === 0}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsOpen(false)
            setQuery('')
            setResults([])
            setCurrentIndex(0)
            setTotalResults(0)
          }}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search Results */}
      {query && results.length > 0 && (
        <div className="bg-background border rounded-lg max-h-60 overflow-y-auto">
          {results.map((message, index) => (
            <div
              key={message.id}
              onClick={() => {
                onMessageClick?.(message.id)
                setIsOpen(false)
              }}
              className={cn(
                "p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0",
                currentIndex - 1 === index && "bg-muted"
              )}
            >
              <div className="flex items-start space-x-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-sm">
                      {message.sender.displayName || message.sender.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {highlightText(message.content, query)}
                  </div>
                  {message.replyTo && (
                    <div className="text-xs text-muted-foreground mt-1 pl-2 border-l-2">
                      Replying to: {highlightText(message.replyTo.content.slice(0, 50), query)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {query && !loading && results.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          No messages found for "{query}"
        </div>
      )}
    </div>
  )
}
