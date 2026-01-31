'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { X, Users, UserPlus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/auth'
import { useContactsStore } from '@/store/contacts'
import { chatAPI } from '@/lib/api'
import { type Contact } from '@/services/contacts'
import { useToast } from '@/hooks/use-toast'

type GroupCreationModalProps = {
  isOpen: boolean
  onClose: () => void
}

export const GroupCreationModal = ({ isOpen, onClose }: GroupCreationModalProps) => {
  const router = useRouter()
  const { user } = useAuthStore()
  const { contacts, refreshAll } = useContactsStore()
  const { toast } = useToast()
  
  const [groupName, setGroupName] = useState('')
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      refreshAll()
      setGroupName('')
      setSelectedContacts([])
      setSearchQuery('')
    }
  }, [isOpen, refreshAll])

  const filteredContacts = useMemo(() => {
    const acceptedContacts = contacts.filter(contact => 
      contact.status === 'accepted' && 
      contact.user.id !== user?.id
    )
    
    if (!searchQuery) return acceptedContacts
    
    return acceptedContacts.filter(contact =>
      contact.user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.user.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [contacts, searchQuery, user?.id])

  const handleToggleContact = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: 'Group name required',
        description: 'Please enter a name for your group.',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    
    try {
      const response = await chatAPI.createChat({
        type: 'GROUP',
        name: groupName.trim(),
        participants: selectedContacts
      })

      if (response.success) {
        toast({
          title: 'Group created',
          description: `"${groupName}" has been created successfully.`,
          variant: 'default'
        })
        
        onClose()
        router.push(`/chat/${response.data.id}`)
      }
    } catch (error: any) {
      console.error('Group creation error:', error)
      toast({
        title: 'Failed to create group',
        description: error.response?.data?.error || error.message || 'Something went wrong',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md max-h-[85svh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Create Group</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Group Name Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Group Name *
            </label>
            <Input
              type="text"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full"
              maxLength={50}
            />
          </div>

          {/* Members Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Add Members (Optional)
            </label>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search contacts"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Selected Count */}
            {selectedContacts.length > 0 && (
              <p className="text-xs text-gray-500">
                {selectedContacts.length} member{selectedContacts.length === 1 ? '' : 's'} selected
              </p>
            )}

            {/* Contacts List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchQuery ? 'No contacts found' : 'No contacts available'}
                  </p>
                </div>
              ) : (
                filteredContacts.map((contact) => {
                  const isSelected = selectedContacts.includes(contact.user.id)
                  const displayName = contact.user.displayName || contact.user.username
                  
                  return (
                    <div
                      key={contact.user.id}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-700' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => handleToggleContact(contact.user.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          isSelected 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {displayName}
                          </p>
                          {contact.user.displayName && (
                            <p className="text-xs text-gray-500">@{contact.user.username}</p>
                          )}
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateGroup}
            disabled={isLoading || !groupName.trim()}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            {isLoading ? 'Creating...' : 'Create Group'}
          </Button>
        </div>
      </div>
    </div>
  )
}