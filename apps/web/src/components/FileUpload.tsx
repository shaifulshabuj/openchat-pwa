'use client'

import { useId, useState, useRef } from 'react'
import { Upload, X, FileText, Image as ImageIcon, Music, Video } from 'lucide-react'
import { Button } from './ui/button'

interface FileUploadProps {
  onFileUploaded: (fileInfo: {
    id: string
    filename: string
    mimetype: string
    size: number
    url: string
    thumbnailUrl?: string
  }) => void
  onClose: () => void
  maxSize?: number // in MB
  allowedTypes?: string[]
}

export function FileUpload({ 
  onFileUploaded, 
  onClose, 
  maxSize = 10,
  allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
    'text/plain',
    'audio/mpeg',
    'audio/wav',
    'video/mp4',
    'video/webm'
  ]
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [compressing, setCompressing] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState(0)
  const [compressionStatus, setCompressionStatus] = useState('Preparing image...')
  const [imageQuality, setImageQuality] = useState(0.82)
  const [maxImageDimension, setMaxImageDimension] = useState(1920)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  const inferMimeType = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop()
    if (!ext) return ''
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      heic: 'image/heic',
      heif: 'image/heif',
      pdf: 'application/pdf',
      txt: 'text/plain',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      mp4: 'video/mp4',
      webm: 'video/webm'
    }
    return mimeMap[ext] || ''
  }

  const isAllowedFileType = (file: File) => {
    if (!allowedTypes.length) return true
    const allowAnyImage = allowedTypes.includes('image/*')
    const type = file.type || inferMimeType(file.name)
    if (!type) {
      return allowAnyImage
    }
    if (allowedTypes.includes(type)) return true
    const [group] = type.split('/')
    return allowedTypes.includes(`${group}/*`)
  }

  const triggerFilePicker = () => {
    const input = fileInputRef.current
    if (!input) return
    input.value = ''
    
    // Mobile-specific handling
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    if (isMobile) {
      // On mobile, use capture for better camera integration
      input.setAttribute('capture', 'environment')
    }
    
    if (typeof (input as HTMLInputElement & { showPicker?: () => void }).showPicker === 'function') {
      ;(input as HTMLInputElement & { showPicker?: () => void }).showPicker?.()
      return
    }
    input.click()
  }

  const isHeicFile = (file: File) => {
    const name = file.name.toLowerCase()
    return (
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      name.endsWith('.heic') ||
      name.endsWith('.heif')
    )
  }

  const normalizeFileType = (file: File) => {
    if (file.type && file.type !== 'application/octet-stream') return file
    const inferred = inferMimeType(file.name)
    if (!inferred) return file
    return new File([file], file.name, { type: inferred, lastModified: file.lastModified })
  }

  const getFileType = (file: File) => file.type || inferMimeType(file.name)

  const isCompressibleImage = (file: File) => {
    const type = getFileType(file)
    return Boolean(type && type.startsWith('image/') && type !== 'image/gif')
  }

  const loadImageFromFile = (file: File) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        resolve(img)
      }
      img.onerror = (event) => {
        URL.revokeObjectURL(objectUrl)
        reject(event)
      }
      img.src = objectUrl
    })
  }

  const getImageBitmap = async (file: File): Promise<ImageBitmap | HTMLImageElement> => {
    if (typeof createImageBitmap === 'function') {
      return await createImageBitmap(file)
    }
    return await loadImageFromFile(file)
  }

  const compressImageFile = async (file: File) => {
    if (!isCompressibleImage(file)) return file

    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image'

    setCompressionStatus('Decoding image...')
    setCompressionProgress(15)

    const imageSource = await getImageBitmap(file)
    const sourceWidth = 'naturalWidth' in imageSource ? imageSource.naturalWidth : imageSource.width
    const sourceHeight = 'naturalHeight' in imageSource ? imageSource.naturalHeight : imageSource.height

    setCompressionStatus('Resizing image...')
    setCompressionProgress(45)

    const maxDimension = Math.max(1, maxImageDimension)
    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight))
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale))
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight

    const ctx = canvas.getContext('2d', { alpha: outputType === 'image/png' })
    if (!ctx) throw new Error('Canvas not supported')

    ctx.drawImage(imageSource as CanvasImageSource, 0, 0, targetWidth, targetHeight)

    if ('close' in imageSource && typeof imageSource.close === 'function') {
      imageSource.close()
    }

    setCompressionStatus('Encoding image...')
    setCompressionProgress(75)

    const blob = await new Promise<Blob | null>((resolve) => {
      if (outputType === 'image/png') {
        canvas.toBlob((result) => resolve(result), outputType)
        return
      }
      canvas.toBlob((result) => resolve(result), outputType, imageQuality)
    })

    if (!blob) throw new Error('Image compression failed')

    setCompressionProgress(95)

    const compressedFile = new File([blob], `${baseName}.${outputType === 'image/png' ? 'png' : 'jpg'}`, {
      type: outputType,
      lastModified: file.lastModified
    })

    const sameDimensions = targetWidth === sourceWidth && targetHeight === sourceHeight
    if (sameDimensions && compressedFile.size >= file.size) {
      return file
    }

    return compressedFile
  }

  const convertHeicToJpeg = async (file: File) => {
    const heic2anyModule = await import('heic2any')
    const heic2any = heic2anyModule.default
    const conversion = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    const outputBlob = Array.isArray(conversion) ? conversion[0] : conversion
    const baseName = file.name.replace(/\.(heic|heif)$/i, '') || 'photo'
    return new File([outputBlob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified
    })
  }

  const prepareFileForUpload = async (file: File) => {
    let workingFile = normalizeFileType(file)

    if (isHeicFile(workingFile)) {
      try {
        setCompressionStatus('Converting HEIC...')
        setCompressionProgress(10)
        workingFile = await convertHeicToJpeg(workingFile)
      } catch (error) {
        console.error('HEIC conversion failed:', error)
        throw new Error('HEIC/HEIF conversion failed')
      }
    }

    if (isCompressibleImage(workingFile)) {
      workingFile = await compressImageFile(workingFile)
    }

    setCompressionProgress(100)
    return workingFile
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100
          setUploadProgress(progress)
        }
      }

      xhr.onload = () => {
        if (xhr.status === 201) {
          const response = JSON.parse(xhr.responseText)
          if (response.success) {
            onFileUploaded(response.data)
            onClose()
          } else {
            setError('Upload failed')
          }
        } else {
          const errorResponse = JSON.parse(xhr.responseText)
          setError(errorResponse.error || 'Upload failed')
        }
        setUploading(false)
      }

      xhr.onerror = () => {
        setError('Upload failed')
        setUploading(false)
      }

      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
      xhr.open('POST', `${apiBase}/api/upload/file`)
      
      // Add auth header
      const token = localStorage.getItem('auth_token')
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      }

      xhr.send(formData)

    } catch (error) {
      console.error('Upload error:', error)
      setError('Upload failed')
      setUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await handleIncomingFile(files[0])
    }
  }

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await handleIncomingFile(files[0])
    }
  }

  const handleIncomingFile = async (file: File) => {
    setError(null)

    const normalizedFile = normalizeFileType(file)

    if (!isAllowedFileType(normalizedFile)) {
      setError('File type not supported')
      return
    }

    const shouldProcess = isCompressibleImage(normalizedFile) || isHeicFile(normalizedFile)
    if (shouldProcess) {
      setCompressing(true)
      setCompressionProgress(0)
      setCompressionStatus('Preparing image...')
    }

    try {
      const preparedFile = await prepareFileForUpload(normalizedFile)

      const maxBytes = maxSize * 1024 * 1024
      if (preparedFile.size > maxBytes) {
        setError(`File too large. Maximum size is ${maxSize}MB.`)
        return
      }

      uploadFile(preparedFile)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'File processing failed'
      if (message === 'HEIC/HEIF conversion failed') {
        setError('HEIC/HEIF format not supported on this device. Please use JPEG or PNG.')
      } else {
        setError(message)
      }
    } finally {
      if (shouldProcess) {
        setTimeout(() => {
          setCompressing(false)
          setCompressionProgress(0)
        }, 200)
      }
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-8 h-8" />
    if (type.startsWith('audio/')) return <Music className="w-8 h-8" />
    if (type.startsWith('video/')) return <Video className="w-8 h-8" />
    return <FileText className="w-8 h-8" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Upload File
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {(compressing || uploading) ? (
            <div className="text-center py-8">
              <div className="mb-4">
                <Upload className="w-12 h-12 text-green-500 mx-auto animate-pulse" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {compressing
                  ? `${compressionStatus} ${Math.round(compressionProgress)}%`
                  : `Uploading... ${Math.round(uploadProgress)}%`}
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${compressing ? compressionProgress : uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div
                className={`relative w-full border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer flex flex-col items-center ${
                  dragOver 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFilePicker}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    triggerFilePicker()
                  }
                }}
              >
                <input
                  id={inputId}
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInputChange}
                  accept={allowedTypes.includes('image/*') ? 'image/*' : allowedTypes.join(',')}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                />
                <div className="pointer-events-none flex flex-col items-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Tap to choose from camera, photo library, or files
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Maximum {maxSize}MB • Images, Documents, Audio, Video
                  </p>
                  <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    Tap anywhere in this area to select a file
                  </p>
                </div>
              </div>

              <div className="mt-4 text-xs text-gray-500 dark:text-gray-500">
                <p className="font-medium mb-1">Supported formats:</p>
                <p>Images: JPEG, PNG, GIF, WebP, HEIC</p>
                <p>Documents: PDF, TXT</p>
                <p>Audio: MP3, WAV</p>
                <p>Video: MP4, WebM</p>
              </div>

              <div className="mt-4 rounded-md border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Image compression settings
                </p>
                <div className="flex items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-300">
                  <label htmlFor={`${inputId}-quality`} className="whitespace-nowrap">
                    Quality ({Math.round(imageQuality * 100)}%)
                  </label>
                  <input
                    id={`${inputId}-quality`}
                    type="range"
                    min={0.6}
                    max={0.95}
                    step={0.01}
                    value={imageQuality}
                    onChange={(event) => setImageQuality(Number(event.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-300">
                  <label htmlFor={`${inputId}-max-dim`} className="whitespace-nowrap">
                    Max dimension
                  </label>
                  <select
                    id={`${inputId}-max-dim`}
                    value={String(maxImageDimension)}
                    onChange={(event) => setMaxImageDimension(Number(event.target.value))}
                    className="w-full rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 text-xs"
                  >
                    <option value="1280">1280 px</option>
                    <option value="1920">1920 px</option>
                    <option value="2560">2560 px</option>
                    <option value="4096">4096 px</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
