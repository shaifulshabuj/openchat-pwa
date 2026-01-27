import { api } from '@/lib/api'

export type ContactUser = {
  id: string
  username: string
  displayName: string
  avatar?: string
  status: string
}

export type Contact = {
  chatId: string
  user: ContactUser
  status: 'accepted' | 'pending' | 'declined'
  isBlocked?: boolean
}

export type ContactRequest = {
  id: string
  chatId: string
  status: 'pending'
  direction: 'incoming' | 'outgoing'
  createdAt: string
  fromUser?: ContactUser
  toUser?: ContactUser
}

export const contactsAPI = {
  async searchUsers(query: string) {
    const response = await api.get(`/api/users/search?q=${encodeURIComponent(query)}`)
    return response.data as { success: boolean; data: ContactUser[] }
  },

  async listContacts() {
    const response = await api.get('/api/contacts')
    return response.data as { success: boolean; data: Contact[] }
  },

  async listRequests() {
    const response = await api.get('/api/contacts/requests')
    return response.data as { success: boolean; data: ContactRequest[] }
  },

  async sendRequest(userId: string) {
    const response = await api.post('/api/contacts/request', { userId })
    return response.data as { success: boolean; data: { chatId: string; requestId: string } }
  },

  async respondToRequest(requestId: string, status: 'accepted' | 'declined') {
    const response = await api.post(`/api/contacts/requests/${requestId}/respond`, { status })
    return response.data as { success: boolean; data: { chatId: string; status: string } }
  },

  async blockContact(contactId: string) {
    const response = await api.post(`/api/contacts/${contactId}/block`)
    return response.data as { success: boolean; data: { chatId: string; status: string } }
  },

  async unblockContact(contactId: string) {
    const response = await api.post(`/api/contacts/${contactId}/unblock`)
    return response.data as { success: boolean; data: { chatId: string; status: string } }
  }
}
