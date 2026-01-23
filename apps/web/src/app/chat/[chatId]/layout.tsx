// Generate static parameters for static export
export function generateStaticParams() {
  // For demo purposes, generate some common chat IDs
  // In a real app, you might fetch this from an API or database
  return [
    { chatId: 'demo' },
    { chatId: 'general' },
    { chatId: 'random' },
  ]
}

interface ChatLayoutProps {
  children: React.ReactNode
  params: Promise<{ chatId: string }>
}

export default function ChatLayout({ children, params }: ChatLayoutProps) {
  return children
}