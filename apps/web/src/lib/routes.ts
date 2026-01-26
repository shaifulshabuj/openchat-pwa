export const chatRoute = (chatId: string) => {
  const isStatic = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true'
  if (isStatic) {
    return `/chat?chatId=${encodeURIComponent(chatId)}`
  }

  return `/chat/${encodeURIComponent(chatId)}`
}
