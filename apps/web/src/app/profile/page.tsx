'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FileUpload } from '@/components/FileUpload'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/

export default function ProfilePage() {
  const router = useRouter()
  const { user, updateProfile, isLoading } = useAuthStore()
  const { toast } = useToast()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [status, setStatus] = useState<'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE'>('ONLINE')
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined)
  const [showAvatarUpload, setShowAvatarUpload] = useState(false)
  const [showAvatarPreview, setShowAvatarPreview] = useState(false)

  useEffect(() => {
    if (!user) return
    setDisplayName(user.displayName || '')
    setUsername(user.username || '')
    setBio(user.bio || '')
    setStatus(user.status || 'ONLINE')
    setAvatarUrl(user.avatar ?? undefined)
  }, [user])

  const resolvedAvatar = useMemo(() => {
    if (!avatarUrl) return undefined
    if (avatarUrl.startsWith('http')) return avatarUrl
    const apiBase = process.env.NEXT_PUBLIC_API_URL || ''
    return apiBase ? `${apiBase}${avatarUrl}` : avatarUrl
  }, [avatarUrl])

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Invalid display name',
        description: 'Display name is required.'
      })
      return
    }

    if (!username.trim()) {
      toast({
        variant: 'destructive',
        title: 'Invalid username',
        description: 'Username is required.'
      })
      return
    }

    if (!USERNAME_REGEX.test(username.trim())) {
      toast({
        variant: 'destructive',
        title: 'Invalid username',
        description: 'Use letters, numbers, and underscores only.'
      })
      return
    }

    if (username.trim().length < 3 || username.trim().length > 30) {
      toast({
        variant: 'destructive',
        title: 'Invalid username length',
        description: 'Username must be 3–30 characters.'
      })
      return
    }

    try {
      const payload: Record<string, any> = {
        displayName: displayName.trim(),
        username: username.trim(),
        status,
      }
      if (bio.trim()) payload.bio = bio.trim()
      if (avatarUrl) {
        if (avatarUrl.startsWith('http')) {
          payload.avatar = avatarUrl
        } else {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || ''
          payload.avatar = apiBase ? `${apiBase}${avatarUrl}` : avatarUrl
        }
      }

      await updateProfile(payload)
      toast({
        variant: 'success',
        title: 'Profile updated',
        description: 'Your profile changes have been saved.'
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: error?.response?.data?.error || 'Unable to update profile.'
      })
    }
  }

  const handleAvatarUploaded = (fileInfo: any) => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || ''
    const resolveUrl = (url?: string | null) => {
      if (!url) return undefined
      if (url.startsWith('http')) return url
      if (!apiBase) return url
      return `${apiBase}${url}`
    }

    const resolved = resolveUrl(fileInfo.url)
    setAvatarUrl(resolved)
    setShowAvatarUpload(false)
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="min-h-[100svh] bg-white dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 pt-[calc(env(safe-area-inset-top)+8px)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Manage your identity</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div
                className={`h-20 w-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center overflow-hidden ${resolvedAvatar ? 'cursor-pointer' : ''}`}
                onClick={() => resolvedAvatar && setShowAvatarPreview(true)}
                role={resolvedAvatar ? 'button' : undefined}
                tabIndex={resolvedAvatar ? 0 : -1}
                onKeyDown={(event) => {
                  if (!resolvedAvatar) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setShowAvatarPreview(true)
                  }
                }}
              >
                {resolvedAvatar ? (
                  <img src={resolvedAvatar} alt="Avatar" className="h-20 w-20 object-cover" />
                ) : (
                  <span className="text-2xl font-semibold text-green-600 dark:text-green-400">
                    {user.displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowAvatarUpload(true)}
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow"
                aria-label="Change avatar"
              >
                <Camera className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{user.displayName}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
              <p className="text-xs text-gray-400 mt-1">Upload a JPG, PNG, GIF, or WebP</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Display Name
            </label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Username
            </label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            <p className="mt-1 text-xs text-gray-500">Letters, numbers, and underscores only.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Bio
            </label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              placeholder="Tell others about yourself..."
            />
            <p className="mt-1 text-xs text-gray-500">{bio.length}/160</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="ONLINE">Online</option>
              <option value="AWAY">Away</option>
              <option value="BUSY">Busy</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save changes'}
            </Button>
            <Button variant="outline" onClick={() => router.push('/')}>Cancel</Button>
          </div>
        </div>
      </main>

      {showAvatarUpload && (
        <FileUpload
          onFileUploaded={handleAvatarUploaded}
          onClose={() => setShowAvatarUpload(false)}
          maxSize={5}
          allowedTypes={[
            'image/*',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/heic',
            'image/heif'
          ]}
        />
      )}

      <Dialog open={showAvatarPreview} onOpenChange={setShowAvatarPreview}>
        <DialogContent className="sm:max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="text-gray-900 dark:text-gray-100">Profile photo</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-6 py-6">
            {resolvedAvatar ? (
              <img
                src={resolvedAvatar}
                alt={`${user?.displayName || 'User'} avatar`}
                className="max-h-[70vh] w-auto max-w-full rounded-xl shadow-lg"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
