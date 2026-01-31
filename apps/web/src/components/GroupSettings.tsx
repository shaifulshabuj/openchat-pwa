'use client'

import { useState, useEffect } from 'react'
import { 
  Settings, 
  Users, 
  Shield, 
  UserPlus, 
  UserMinus, 
  Crown,
  ShieldOff,
  Edit3,
  Save,
  X
} from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { chatAPI } from '@/lib/api'
import { GroupInviteModal } from './GroupInviteModal'

interface GroupMember {
  id: string
  user: {
    id: string
    username: string
    displayName: string
    avatar?: string
    status: string
  }
  joinedAt: string
  isAdmin: boolean
}

interface GroupSettingsProps {
  chatId: string
  groupName: string
  groupDescription?: string
  groupAvatar?: string
  isAdmin: boolean
  onClose: () => void
  onUpdate: (data: { name?: string, description?: string, avatar?: string }) => void
}

export default function GroupSettings({
  chatId,
  groupName,
  groupDescription,
  groupAvatar,
  isAdmin,
  onClose,
  onUpdate
}: GroupSettingsProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'permissions'>('info')
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(false)
  const [editingInfo, setEditingInfo] = useState(false)
  const [name, setName] = useState(groupName)
  const [description, setDescription] = useState(groupDescription || '')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const { toast } = useToast()

  const loadMembers = async () => {
    try {
      setLoading(true)
      const response = await chatAPI.getGroupMembers(chatId)
      setMembers(response.data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load group members',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'members') {
      loadMembers()
    }
  }, [activeTab, chatId])

  const handleSaveInfo = async () => {
    try {
      setLoading(true)
      const response = await chatAPI.updateGroupSettings(chatId, { 
        name: name.trim(), 
        description: description.trim() 
      })
      
      onUpdate({
        name: response.data.name,
        description: response.data.description
      })
      
      setEditingInfo(false)
      toast({
        title: 'Success',
        description: 'Group information updated successfully'
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update group information',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePromoteAdmin = async (userId: string) => {
    try {
      await chatAPI.promoteAdmin(chatId, userId)
      await loadMembers()
      toast({
        title: 'Success',
        description: 'Member promoted to admin successfully'
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to promote member',
        variant: 'destructive'
      })
    }
  }

  const handleDemoteAdmin = async (userId: string) => {
    try {
      await chatAPI.demoteAdmin(chatId, userId)
      await loadMembers()
      toast({
        title: 'Success',
        description: 'Admin demoted to member successfully'
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to demote admin',
        variant: 'destructive'
      })
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the group?')) {
      return
    }

    try {
      await chatAPI.removeGroupMember(chatId, userId)
      await loadMembers()
      toast({
        title: 'Success',
        description: 'Member removed successfully'
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove member',
        variant: 'destructive'
      })
    }
  }

  const tabs = [
    { id: 'info' as const, label: 'Group Info', icon: Settings },
    { id: 'members' as const, label: 'Members', icon: Users },
    ...(isAdmin ? [{ id: 'permissions' as const, label: 'Permissions', icon: Shield }] : [])
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Group Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-green-600 border-b-2 border-green-600 bg-green-50 dark:bg-green-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">
                    {name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              {editingInfo ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Group Name
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter group name"
                      maxLength={50}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter group description"
                      maxLength={500}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSaveInfo} 
                      disabled={loading || !name.trim()}
                      className="flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditingInfo(false)
                        setName(groupName)
                        setDescription(groupDescription || '')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Group Name</h3>
                    <p className="text-gray-600 dark:text-gray-400">{name}</p>
                  </div>
                  {description && (
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">Description</h3>
                      <p className="text-gray-600 dark:text-gray-400">{description}</p>
                    </div>
                  )}
                  {isAdmin && (
                    <Button 
                      onClick={() => setEditingInfo(true)}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Info
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Members ({members.length})
                </h3>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowInviteModal(true)}
                      className="flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Invite Members
                    </Button>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-white">
                            {member.user.displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {member.user.displayName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            @{member.user.username}
                          </p>
                        </div>
                        {member.isAdmin && (
                          <Crown className="w-4 h-4 text-yellow-500" />
                        )}
                        <div className={`w-2 h-2 rounded-full ${
                          member.user.status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          {member.isAdmin ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDemoteAdmin(member.user.id)}
                              className="flex items-center gap-1 text-orange-600 hover:text-orange-700"
                            >
                              <ShieldOff className="w-4 h-4" />
                              Demote
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePromoteAdmin(member.user.id)}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                            >
                              <Shield className="w-4 h-4" />
                              Promote
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveMember(member.user.id)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700"
                          >
                            <UserMinus className="w-4 h-4" />
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'permissions' && isAdmin && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Group Permissions</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Send Messages</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Who can send messages in this group</p>
                  </div>
                  <select className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    <option value="all">All Members</option>
                    <option value="admins">Admins Only</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Add Members</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Who can add new members</p>
                  </div>
                  <select className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    <option value="admins">Admins Only</option>
                    <option value="all">All Members</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Edit Group Info</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Who can edit group name and description</p>
                  </div>
                  <select className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    <option value="admins">Admins Only</option>
                    <option value="all">All Members</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showInviteModal && (
        <GroupInviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          chatId={chatId}
          groupName={groupName}
        />
      )}
    </div>
  )
}
