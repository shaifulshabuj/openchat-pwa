import { create } from 'zustand'
import { contactsAPI, type Contact, type ContactRequest } from '@/services/contacts'

type ContactsState = {
  contacts: Contact[]
  requests: ContactRequest[]
  isLoading: boolean
  error: string | null
  loadContacts: () => Promise<void>
  loadRequests: () => Promise<void>
  refreshAll: () => Promise<void>
  updateStatus: (userId: string, status: string) => void
}

export const useContactsStore = create<ContactsState>((set) => ({
  contacts: [],
  requests: [],
  isLoading: false,
  error: null,
  loadContacts: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await contactsAPI.listContacts()
      set({ contacts: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error?.message || 'Failed to load contacts', isLoading: false })
    }
  },
  loadRequests: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await contactsAPI.listRequests()
      set({ requests: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error?.message || 'Failed to load requests', isLoading: false })
    }
  },
  refreshAll: async () => {
    set({ isLoading: true, error: null })
    try {
      const [contactsResponse, requestsResponse] = await Promise.all([
        contactsAPI.listContacts(),
        contactsAPI.listRequests()
      ])
      set({
        contacts: contactsResponse.data,
        requests: requestsResponse.data,
        isLoading: false
      })
    } catch (error: any) {
      set({ error: error?.message || 'Failed to refresh contacts', isLoading: false })
    }
  },
  updateStatus: (userId, status) => {
    set((state) => ({
      contacts: state.contacts.map((contact) =>
        contact.user.id === userId ? { ...contact, user: { ...contact.user, status } } : contact
      ),
      requests: state.requests.map((request) => ({
        ...request,
        fromUser:
          request.fromUser?.id === userId
            ? { ...request.fromUser, status }
            : request.fromUser,
        toUser:
          request.toUser?.id === userId ? { ...request.toUser, status } : request.toUser
      }))
    }))
  }
}))
