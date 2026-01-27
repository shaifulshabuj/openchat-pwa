// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
  const options = {
    body: 'New message received',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Open Chat',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-72x72.png'
      }
    ]
  }

  if (event.data) {
    try {
      const data = event.data.json()
      options.body = data.body || options.body
      options.data.url = data.url || options.data.url
      options.data.chatId = data.chatId
      options.data.messageId = data.messageId
    } catch (e) {
      console.error('Error parsing push data:', e)
    }
  }

  event.waitUntil(
    self.registration.showNotification('OpenChat', options)
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  if (event.action === 'close') {
    return
  }

  const url = event.notification.data?.url || '/'
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      
      // Open a new window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// Install and activate service worker
self.addEventListener('install', function(event) {
  console.log('Service Worker installed')
  self.skipWaiting()
})

self.addEventListener('activate', function(event) {
  console.log('Service Worker activated')
  event.waitUntil(self.clients.claim())
})