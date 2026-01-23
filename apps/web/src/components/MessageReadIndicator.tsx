'use client'

import { Check, CheckCheck } from 'lucide-react'

export interface ReadStatus {
  messageId: string
  isOwn: boolean
  readCount: number
  totalParticipants: number
  allRead: boolean
}

interface MessageReadIndicatorProps {
  status: ReadStatus
  className?: string
}

export function MessageReadIndicator({ status, className = '' }: MessageReadIndicatorProps) {
  if (!status.isOwn) {
    // Don't show read indicators for messages we didn't send
    return null
  }

  if (status.totalParticipants === 0) {
    // No other participants to read the message
    return (
      <Check className={`w-3 h-3 text-green-100 opacity-70 ${className}`} />
    )
  }

  if (status.allRead) {
    // All participants have read the message
    return (
      <CheckCheck className={`w-3 h-3 text-blue-300 ${className}`} title="Read by all" />
    )
  } else if (status.readCount > 0) {
    // Some participants have read the message
    return (
      <CheckCheck className={`w-3 h-3 text-green-100 opacity-70 ${className}`} title={`Read by ${status.readCount} of ${status.totalParticipants}`} />
    )
  } else {
    // Message delivered but not read by anyone
    return (
      <Check className={`w-3 h-3 text-green-100 opacity-70 ${className}`} title="Delivered" />
    )
  }
}