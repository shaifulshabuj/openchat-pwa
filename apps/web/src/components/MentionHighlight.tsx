'use client'

interface MentionHighlightProps {
  content: string
  className?: string
}

export function MentionHighlight({ content, className = '' }: MentionHighlightProps) {
  // Parse mentions in the content
  const parseMentions = (text: string) => {
    const mentionPattern = /(^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]{3,30})/g
    const parts: Array<{ text: string; isMention: boolean }> = []
    let lastIndex = 0
    let match

    while ((match = mentionPattern.exec(text)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index + match[1].length)
        if (beforeText) {
          parts.push({ text: beforeText, isMention: false })
        }
      }
      
      // Add the mention
      const mentionText = '@' + match[2]
      parts.push({ text: mentionText, isMention: true })
      
      lastIndex = match.index + match[0].length
    }

    // Add remaining text after last mention
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), isMention: false })
    }

    return parts.length > 0 ? parts : [{ text, isMention: false }]
  }

  const parts = parseMentions(content)

  return (
    <span className={className}>
      {parts.map((part, index) => (
        <span
          key={index}
          className={
            part.isMention
              ? 'text-blue-600 dark:text-blue-400 font-medium bg-blue-100 dark:bg-blue-900/30 px-1 rounded'
              : ''
          }
        >
          {part.text}
        </span>
      ))}
    </span>
  )
}