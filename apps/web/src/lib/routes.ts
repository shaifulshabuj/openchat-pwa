export const chatRoute = (chatId: string) => {
  const isStatic = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true'
  if (isStatic) {
    return {
      pathname: '/chat',
      query: { chatId }
    }
  }

  return `/chat/${encodeURIComponent(chatId)}`
}
