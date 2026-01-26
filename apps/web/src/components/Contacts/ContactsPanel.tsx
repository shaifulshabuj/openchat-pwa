'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QRCodeScanner } from '@/components/QRCodeScanner'
import { useAuthStore } from '@/store/auth'
import { useContactsStore } from '@/store/contacts'
import { contactsAPI, type ContactRequest, type ContactUser } from '@/services/contacts'
import { useSocket } from '@/hooks/useSocket'
import { chatRoute } from '@/lib/routes'

type ContactsPanelProps = {
  onClose?: () => void
}

export const ContactsPanel = ({ onClose }: ContactsPanelProps) => {
  const router = useRouter()
  const { user } = useAuthStore()
  const { contacts, requests, isLoading, error, refreshAll, updateStatus } = useContactsStore()
  const { on, off } = useSocket()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ContactUser[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  useEffect(() => {
    const handleStatus = ({ userId, status }: { userId: string; status: string }) => {
      updateStatus(userId, status)
    }

    on('user-status-changed', handleStatus)
    return () => {
      off('user-status-changed', handleStatus)
    }
  }, [on, off, updateStatus])

  const incomingRequests = useMemo(
    () => requests.filter((request) => request.direction === 'incoming'),
    [requests]
  )
  const outgoingRequests = useMemo(
    () => requests.filter((request) => request.direction === 'outgoing'),
    [requests]
  )

  const handleSearch = async (value?: string | React.MouseEvent) => {
    const rawValue = typeof value === 'string' ? value : query
    const searchValue = rawValue.trim()
    if (!searchValue) return
    setSearchLoading(true)
    setSearchError(null)
    try {
      const response = await contactsAPI.searchUsers(searchValue)
      const filtered = response.data.filter((result) => result.id !== user?.id)
      setSearchResults(filtered)
    } catch (err: any) {
      setSearchError(err?.message || 'Failed to search users')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleSendRequest = async (userId: string) => {
    await contactsAPI.sendRequest(userId)
    await refreshAll()
  }

  const handleRespond = async (requestId: string, status: 'accepted' | 'declined') => {
    await contactsAPI.respondToRequest(requestId, status)
    await refreshAll()
  }

  const handleStartChat = (chatId: string) => {
    router.push(chatRoute(chatId) as any)
    onClose?.()
  }

  const handleBlock = async (contactId: string) => {
    await contactsAPI.blockContact(contactId)
    await refreshAll()
  }

  const handleUnblock = async (contactId: string) => {
    await contactsAPI.unblockContact(contactId)
    await refreshAll()
  }

  const handleQrScan = async (value: string) => {
    setQuery(value)
    await handleSearch(value)
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          Contacts
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Find people by username or email and start a conversation.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Search by username or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button size="sm" onClick={handleSearch} disabled={searchLoading}>
            Search
          </Button>
        </div>
        {searchError && <p className="text-sm text-red-500">{searchError}</p>}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {result.displayName}
                  </p>
                  <p className="text-xs text-gray-500">@{result.username}</p>
                </div>
                <Button size="sm" onClick={() => handleSendRequest(result.id)}>
                  <UserPlus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <QRCodeScanner onScan={handleQrScan} />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Requests
        </h3>
        {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
          <p className="text-sm text-gray-500">No pending requests.</p>
        )}
        {incomingRequests.map((request: ContactRequest) => (
          <div
            key={request.id}
            className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
          >
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {request.fromUser?.displayName || 'Unknown user'}
              </p>
              <p className="text-xs text-gray-500">@{request.fromUser?.username}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleRespond(request.id, 'declined')}>
                Decline
              </Button>
              <Button size="sm" onClick={() => handleRespond(request.id, 'accepted')}>
                Accept
              </Button>
            </div>
          </div>
        ))}
        {outgoingRequests.map((request: ContactRequest) => (
          <div
            key={request.id}
            className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
          >
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {request.toUser?.displayName || 'Unknown user'}
              </p>
              <p className="text-xs text-gray-500">@{request.toUser?.username}</p>
            </div>
            <span className="text-xs text-gray-500">Pending</span>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Your contacts
        </h3>
        {isLoading && <p className="text-sm text-gray-500">Loading contacts...</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {!isLoading && contacts.length === 0 && (
          <p className="text-sm text-gray-500">No contacts yet. Start by adding someone.</p>
        )}
        {contacts.map((contact) => (
          <div
            key={contact.chatId}
            className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
          >
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {contact.user.displayName}
              </p>
              <p className="text-xs text-gray-500">@{contact.user.username}</p>
              <p className="text-xs text-gray-400">Status: {contact.user.status}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleStartChat(contact.chatId)}>
                Start
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleBlock(contact.user.id)}>
                Block
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleUnblock(contact.user.id)}>
                Unblock
              </Button>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
