export const chatRoute = (chatId: string) => {
  const isStatic = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true'
  const encoded = encodeURIComponent(chatId)
  return isStatic ? `/chat?chatId=${encoded}` : `/chat/${encoded}`
}
