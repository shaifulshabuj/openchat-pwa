'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Users, Plus, Settings } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/hooks/use-toast'

interface Group {
  id: string
  name: string
  description: string
  type: string
  isPublic: boolean
  memberCount: number
  maxMembers: number | null
  admin: {
    id: string
    username: string
    displayName: string
    avatar?: string
  } | null
  createdAt: string
  isMember: boolean
  canJoin: boolean
}

interface SearchResult {
  groups: Group[]
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
  }
}

export default function GroupsPage() {
  const { user, token } = useAuthStore()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const showToast = (message: string, type: 'success' | 'error') => {
    toast({
      title: type === 'success' ? 'Success' : 'Error',
      description: message,
      variant: type === 'error' ? 'destructive' : 'default',
    })
  }

  const searchGroups = useCallback(async (query: string, reset = true) => {
    if (!token || query.length < 2) return

    setLoading(true)
    try {
      const searchOffset = reset ? 0 : offset
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chats/search?` + 
        new URLSearchParams({
          q: query,
          limit: '20',
          offset: searchOffset.toString(),
          visibility: 'public'
        }),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to search groups')
      }

      const responseData = await response.json()
      const data: SearchResult = responseData.data // Extract data from the API response wrapper
      
      if (reset) {
        setGroups(data.groups || [])
        setOffset(20)
      } else {
        setGroups(prev => [...(prev || []), ...(data.groups || [])])
        setOffset(prev => prev + 20)
      }
      
      setHasMore(data.pagination?.hasMore || false)
    } catch (error) {
      console.error('Error searching groups:', error)
      showToast('Failed to search groups', 'error')
    } finally {
      setLoading(false)
    }
  }, [token, offset, showToast])

  const joinGroup = async (groupId: string) => {
    if (!token) return

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chats/${groupId}/join`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to join group')
      }

      const result = await response.json()
      
      if (result.success) {
        showToast(
          result.message === 'Join request sent successfully' 
            ? 'Join request sent to group admins' 
            : 'Successfully joined group!', 
          'success'
        )
        
        // Update the group state
        setGroups(prev => prev.map(group => 
          group.id === groupId 
            ? { ...group, isMember: result.message.includes('joined'), canJoin: false }
            : group
        ))
      }
    } catch (error: any) {
      console.error('Error joining group:', error)
      showToast(error.message || 'Failed to join group', 'error')
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      searchGroups(searchQuery.trim(), true)
    }
  }

  const loadMore = () => {
    if (hasMore && !loading && searchQuery) {
      searchGroups(searchQuery, false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Users className="h-8 w-8 text-blue-600" />
          Discover Groups
        </h1>
        <p className="text-gray-600">
          Find and join public groups that match your interests
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search groups by name..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            minLength={2}
            required
          />
          <button
            type="submit"
            disabled={loading || searchQuery.length < 2}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Search
          </button>
        </div>
      </form>

      {/* Search Results */}
      {groups && groups.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Search Results ({groups?.length || 0} groups found)
          </h2>
          
          <div className="grid gap-4">
            {groups?.map((group) => (
              <div
                key={group.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {group.name}
                      </h3>
                      {group.isPublic && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Public
                        </span>
                      )}
                    </div>
                    
                    {group.description && (
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                        {group.maxMembers && ` / ${group.maxMembers}`}
                      </span>
                      
                      {group.admin && (
                        <span>
                          Admin: {group.admin.displayName}
                        </span>
                      )}
                      
                      <span>
                        Created {new Date(group.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    {group.isMember ? (
                      <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-md">
                        Joined
                      </span>
                    ) : group.canJoin ? (
                      <button
                        onClick={() => joinGroup(group.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Join Group
                      </button>
                    ) : (
                      <span className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md">
                        Request Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center mt-6">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More Groups'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {(groups?.length === 0) && searchQuery && !loading && (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No groups found
          </h3>
          <p className="text-gray-600">
            Try searching with different keywords or create your own group
          </p>
        </div>
      )}

      {/* Initial State */}
      {(groups?.length === 0) && !searchQuery && (
        <div className="text-center py-12">
          <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Discover Groups
          </h3>
          <p className="text-gray-600">
            Search for groups by name to find communities that match your interests
          </p>
        </div>
      )}

      {loading && (groups?.length === 0) && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Searching groups...</p>
        </div>
      )}
    </div>
  )
}