'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Camera } from 'lucide-react'

type QRCodeScannerProps = {
  onScan: (value: string) => void
}

export const QRCodeScanner = ({ onScan }: QRCodeScannerProps) => {
  const [value, setValue] = useState('')
  const { toast } = useToast()
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown')
  const scannerRef = useRef<any>(null)
  const regionId = 'qr-scanner-region'
  const permissionKey = 'openchat_camera_permission'
  const [retryToken, setRetryToken] = useState(0)

  const handleScan = () => {
    const trimmed = value.trim()
    if (!trimmed) {
      toast({
        variant: 'destructive',
        title: 'Paste a code',
        description: 'Enter an OpenChat code, user ID, or username to continue.',
      })
      return
    }
    onScan(trimmed)
    setValue('')
  }

  useEffect(() => {
    const saved = localStorage.getItem(permissionKey)
    if (saved === 'denied') {
      setPermissionStatus('denied')
    }

    if (!navigator.permissions?.query) return
    navigator.permissions
      .query({ name: 'camera' as PermissionName })
      .then((status) => {
        setPermissionStatus(status.state === 'denied' ? 'denied' : status.state)
        status.onchange = () => {
          setPermissionStatus(status.state === 'denied' ? 'denied' : status.state)
          if (status.state !== 'denied') {
            localStorage.removeItem(permissionKey)
          }
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isCameraOpen) return
    if (permissionStatus === 'denied') {
      return
    }
    if (!window.isSecureContext) {
      toast({
        variant: 'destructive',
        title: 'Secure context required',
        description: 'Camera access requires HTTPS or localhost.',
      })
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        variant: 'destructive',
        title: 'Camera not supported',
        description: 'Your browser does not support camera access.',
      })
      return
    }
    if (permissionStatus !== 'granted') {
      return
    }

    let active = true

    const waitForRegion = async () => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const region = document.getElementById(regionId)
        if (region) return region
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      return null
    }

    const startScanner = async () => {
      try {
        setIsCameraReady(false)
        const { Html5Qrcode } = await import('html5-qrcode')
        if (!active) return
        const region = await waitForRegion()
        if (!region) {
          toast({
            variant: 'destructive',
            title: 'Scanner unavailable',
            description: 'Camera view could not be mounted. Please try again.',
          })
          return
        }
        const scanner = new Html5Qrcode(regionId)
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => {
            if (!active) return
            onScan(decodedText)
            setIsCameraOpen(false)
          },
          () => {}
        )
        setIsCameraReady(true)
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Camera unavailable',
          description: 'Unable to access the camera. Check permissions and try again.',
        })
        setIsCameraReady(false)
      }
    }

    startScanner()

    return () => {
      active = false
      const stopScanner = async () => {
        try {
          if (scannerRef.current) {
            await scannerRef.current.stop()
            await scannerRef.current.clear()
          }
        } catch {
          // Ignore cleanup errors.
        } finally {
          scannerRef.current = null
          setIsCameraReady(false)
        }
      }
      stopScanner()
    }
  }, [isCameraOpen, onScan, toast, permissionStatus, retryToken])

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((track) => track.stop())
      localStorage.removeItem(permissionKey)
      setPermissionStatus('granted')
      setRetryToken((prev) => prev + 1)
    } catch {
      localStorage.setItem(permissionKey, 'denied')
      setPermissionStatus('denied')
      toast({
        variant: 'destructive',
        title: 'Camera blocked',
        description: 'Enable camera permission in your browser settings to scan QR codes.',
      })
    }
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
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleScan()
            }
          }}
        />
        <Button size="sm" onClick={handleScan}>
          Scan
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          onClick={async () => {
            await requestCameraPermission()
            setIsCameraOpen(true)
          }}
          aria-label="Use camera to scan QR code"
        >
          <Camera className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl">
          <DialogHeader>
            <DialogTitle>Scan QR code</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2">
              <div className="relative w-full overflow-hidden rounded-lg bg-black">
                <div
                  id={regionId}
                  className="w-full h-[240px] sm:h-[320px]"
                />
              </div>
            </div>
            {!isCameraReady && (
              <p className="text-xs text-gray-500">Waiting for camera access...</p>
            )}
            {permissionStatus === 'denied' && (
              <p className="text-xs text-red-500">
                Camera permission is blocked. Use Retry to request access or enable it in settings.
              </p>
            )}
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCameraOpen(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={requestCameraPermission}
              >
                Retry camera
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
