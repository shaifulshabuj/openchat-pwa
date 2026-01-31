export const extractMentionUsernames = (content: string) => {
  const usernames = new Set<string>()
  const pattern = /(^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{3,30})/g

  let match: RegExpExecArray | null = null
  while ((match = pattern.exec(content)) !== null) {
    const username = match[2]
    if (username) {
      usernames.add(username.toLowerCase())
    }
  }

  return Array.from(usernames)
}
