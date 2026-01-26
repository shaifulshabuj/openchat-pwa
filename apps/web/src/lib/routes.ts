export const chatRoute = (chatId: string) => {
  const isStatic = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true'
  if (isStatic) {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
    return `${basePath}/chat?chatId=${encodeURIComponent(chatId)}`
  }

  return `/chat/${encodeURIComponent(chatId)}`
}
