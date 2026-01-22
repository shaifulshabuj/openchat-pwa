'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from './ui/button'

interface PushNotificationManagerProps {
  userId: string
  onSubscriptionChange?: (subscription: PushSubscription | null) => void
}

export function PushNotificationManager({ userId, onSubscriptionChange }: PushNotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check if push notifications are supported
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window)
    
    // Get current permission status
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }

    // Check if already subscribed
    checkExistingSubscription()
  }, [])

  const checkExistingSubscription = async () => {
    if (!isSupported) return

    try {
      const registration = await navigator.serviceWorker.ready
      const existingSubscription = await registration.pushManager.getSubscription()
      setSubscription(existingSubscription)
      onSubscriptionChange?.(existingSubscription)
    } catch (error) {
      console.error('Error checking existing subscription:', error)
    }
  }

  const requestPermission = async () => {
    if (!isSupported) return false

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === 'granted'
    } catch (error) {
      console.error('Error requesting permission:', error)
      return false
    }
  }

  const subscribe = async () => {
    if (!isSupported || permission !== 'granted') return

    setIsLoading(true)
    
    try {
      const registration = await navigator.serviceWorker.ready
      
      // VAPID public key (you'll need to generate this for production)
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BH7mKSNmkVq7i9PCFdLsOaZX8s3O9M1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })

      // Send subscription to server
      await sendSubscriptionToServer(pushSubscription)
      
      setSubscription(pushSubscription)
      onSubscriptionChange?.(pushSubscription)
      
      // Show success notification
      showLocalNotification('Push notifications enabled!', {
        body: 'You will now receive notifications for new messages',
        icon: '/icons/icon-192x192.png'
      })
      
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const unsubscribe = async () => {
    if (!subscription) return

    setIsLoading(true)

    try {
      await subscription.unsubscribe()
      
      // Remove subscription from server
      await removeSubscriptionFromServer(subscription)
      
      setSubscription(null)
      onSubscriptionChange?.(null)
      
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendSubscriptionToServer = async (subscription: PushSubscription) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          userId,
          subscription: subscription.toJSON()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save subscription to server')
      }
    } catch (error) {
      console.error('Error sending subscription to server:', error)
      throw error
    }
  }

  const removeSubscriptionFromServer = async (subscription: PushSubscription) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          userId,
          subscription: subscription.toJSON()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to remove subscription from server')
      }
    } catch (error) {
      console.error('Error removing subscription from server:', error)
    }
  }

  const showLocalNotification = (title: string, options?: NotificationOptions) => {
    if (permission === 'granted') {
      new Notification(title, options)
    }
  }

  const handleToggle = async () => {
    if (subscription) {
      await unsubscribe()
    } else {
      const hasPermission = permission === 'granted' || await requestPermission()
      if (hasPermission) {
        await subscribe()
      }
    }
  }

  // Helper function to convert VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    
    return outputArray
  }

  if (!isSupported) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Push notifications not supported
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
          Push Notifications
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {subscription 
            ? 'Get notified of new messages' 
            : 'Enable to receive notifications'
          }
        </p>
      </div>
      
      <Button
        onClick={handleToggle}
        disabled={isLoading || permission === 'denied'}
        variant={subscription ? 'secondary' : 'default'}
        size="sm"
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : subscription ? (
          <BellOff className="w-4 h-4" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
        <span className="ml-2">
          {subscription ? 'Disable' : 'Enable'}
        </span>
      </Button>
      
      {permission === 'denied' && (
        <p className="text-xs text-red-500">
          Notifications blocked. Please enable in browser settings.
        </p>
      )}
    </div>
  )
}