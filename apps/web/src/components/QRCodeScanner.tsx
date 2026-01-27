'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type QRCodeScannerProps = {
  onScan: (value: string) => void
}

export const QRCodeScanner = ({ onScan }: QRCodeScannerProps) => {
  const [value, setValue] = useState('')

  const handleScan = () => {
    if (!value.trim()) return
    onScan(value.trim())
    setValue('')
  }

  return (
    <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-4">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        Scan QR code (paste OpenChat code, user ID, or username)
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="Paste code or username..."
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <Button size="sm" onClick={handleScan}>
          Scan
        </Button>
      </div>
    </div>
  )
}
